import * as k8s from "@pulumi/kubernetes";

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
import { CreateNamespace } from "../k8s";
import { CreateHttpProbe } from "../k8s";
import { CreateDeployment } from "../k8s";
import { CreateService } from "../k8s";
import { CreatePodDisruptionBudget } from "../k8s";
import { CreateNginxIngress } from "../k8s/nginxingress";

interface StackArgs extends CommonArgs {
  dnsZoneName: Input<string>;
  domain?: Input<string>;
  letsEncryptIssuer: Input<string>;
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
export class GenericStack extends ComponentResource {
  readonly labels?: Input<{
    [key: string]: Input<string>;
  }>;
  readonly namespace: k8s.core.v1.Namespace;
  readonly readinessProbe?: inputs.core.v1.Probe;
  readonly livenessPorbe?: inputs.core.v1.Probe;
  readonly disruptionBudget?: k8s.policy.v1beta1.PodDisruptionBudget;
  readonly deployment: DeploymentInfo;
  readonly service?: ServiceInfo;
  readonly ingress?: k8s.networking.v1.Ingress;

  constructor(
    name: string,
    args: StackArgs,
    options?: ComponentResourceOptions
  ) {
    super("k8s:composite:stack", name, args, options);

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
    this.readinessProbe = args.domain
      ? CreateHttpProbe({
          path: args.readinessPath || "/healthz",
          host: args.domain,
          port: args.container.portNumber,
        })
      : undefined;
    this.livenessPorbe = args.domain
      ? CreateHttpProbe({
          path: args.livenessPath || "/healthz",
          host: args.domain,
          port: args.container.portNumber,
        })
      : undefined;
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
      this.service && args.domain
        ? CreateNginxIngress(
            `${name}-ing`,
            {
              namespace: this.namespace,
              labels: this.labels,
              letsEncryptIssuer: args.letsEncryptIssuer,
              domain: args.domain,
              serviceInfo: this.service,
            },
            childOptions
          )
        : undefined;
  }
}
