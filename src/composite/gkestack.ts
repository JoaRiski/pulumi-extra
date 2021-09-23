import * as gcp from "@pulumi/gcp";
import * as k8s from "@pulumi/kubernetes";
import { ManagedCertificate } from "../gcp/gke/certificate";
import {
  ComponentResource,
  ComponentResourceOptions,
  Input,
} from "@pulumi/pulumi";
import * as _ from "lodash";
import { input as inputs } from "@pulumi/kubernetes/types";
import {
  CommonArgs,
  ContainerEnv,
  CpuAllocation,
  DeploymentInfo,
  MemoryAllocation,
  ServiceInfo,
  Sidecar,
} from "../types";
import { CreateNamespace } from "../k8s/namespace";
import { CreateHttpProbe } from "../k8s/probe";
import { CreateDeployment } from "../k8s/deployment";
import { CreateService } from "../k8s/service";
import { CreateIngress } from "../k8s/ingress";
import { CreatePodDisruptionBudget } from "../k8s/disruptionbudget";
import { CreateDnsRecords } from "../gcp";
import { CreateCertificate } from "../gcp";
import { CreateAddress } from "../gcp";

interface StackArgs extends CommonArgs {
  dnsZoneName: Input<string>;
  domain: Input<string>;
  replicas?: Input<number>;
  livenessPath?: Input<string>;
  readinessPath?: Input<string>;
  minAvailable?: Input<number>;
  maxUnavailable?: Input<number>;
  sidecars?: Sidecar[];
  container: {
    env?: ContainerEnv;
    image: Input<string>;
    portNumber: Input<number>;
    cpu: CpuAllocation;
    memory: MemoryAllocation;
  };
  namespace?: k8s.core.v1.Namespace;
  labels?: Input<{
    [key: string]: Input<string>;
  }>;
}
export class GkeStack extends ComponentResource {
  readonly labels?: Input<{
    [key: string]: Input<string>;
  }>;
  readonly namespace: k8s.core.v1.Namespace;
  readonly address?: gcp.compute.GlobalAddress;
  readonly dnsRecords?: gcp.dns.RecordSet;
  readonly certificate?: ManagedCertificate;
  readonly readinessProbe: inputs.core.v1.Probe;
  readonly livenessPorbe: inputs.core.v1.Probe;
  readonly disruptionBudget?: k8s.policy.v1beta1.PodDisruptionBudget;
  readonly deployment: DeploymentInfo;
  readonly service?: ServiceInfo;
  readonly ingress?: k8s.networking.v1.Ingress;

  constructor(
    name: string,
    args: StackArgs,
    options?: ComponentResourceOptions
  ) {
    super("k8s:gke:stack", name, args, options);

    const childOptions = {
      parent: this,
    };
    this.labels = _.merge({}, args.labels || {}, {
      gestack: name,
    });

    this.namespace = args.namespace
      ? args.namespace
      : CreateNamespace(
          `${name}-ns`,
          {
            labels: this.labels,
          },
          childOptions
        );
    this.address = args.container.portNumber
      ? CreateAddress(
          `${name}-address`,
          {
            labels: this.labels,
          },
          childOptions
        )
      : undefined;
    this.dnsRecords = this.address
      ? CreateDnsRecords(
          `${name}-dns`,
          {
            labels: this.labels,
            dnsZoneName: args.dnsZoneName,
            domain: args.domain,
            address: this.address,
          },
          childOptions
        )
      : undefined;
    this.certificate = this.dnsRecords
      ? CreateCertificate(
          `${name}-cert`,
          {
            labels: this.labels,
            namespace: this.namespace,
            dnsRecords: this.dnsRecords,
          },
          childOptions
        )
      : undefined;
    this.readinessProbe = CreateHttpProbe({
      path: args.readinessPath || "/healthz",
      host: args.domain,
      port: args.container.portNumber,
    });
    this.livenessPorbe = CreateHttpProbe({
      path: args.livenessPath || "/healthz",
      host: args.domain,
      port: args.container.portNumber,
    });
    this.deployment = CreateDeployment(
      `${name}-dep`,
      {
        replicas: args.replicas || 1,
        namespace: this.namespace,
        labels: this.labels,
        livenessProbe: this.livenessPorbe,
        readinessProbe: this.readinessProbe,
        portNumber: args.container.portNumber,
        image: args.container.image,
        sidecars: args.sidecars,
        env: args.container.env,
        cpu: args.container.cpu,
        memory: args.container.memory,
      },
      childOptions
    );
    this.disruptionBudget =
      args.minAvailable || args.maxUnavailable
        ? CreatePodDisruptionBudget(
            `${name}-pdb`,
            {
              labels: this.labels,
              namespace: this.namespace,
              matchLabels: this.labels,
              minAvailable: args.minAvailable,
              maxUnavailable: args.maxUnavailable,
            },
            childOptions
          )
        : undefined;
    this.service = this.deployment.port
      ? CreateService(
          `${name}-svc`,
          {
            namespace: this.namespace,
            labels: this.labels,
            portNumber: 80,
            targetPort: this.deployment.port,
          },
          childOptions
        )
      : undefined;
    this.ingress =
      this.service && this.certificate && this.address
        ? CreateIngress(
            `${name}-ing`,
            {
              namespace: this.namespace,
              labels: this.labels,
              certificate: this.certificate,
              domain: args.domain,
              serviceInfo: this.service,
              address: this.address,
            },
            childOptions
          )
        : undefined;
  }
}
