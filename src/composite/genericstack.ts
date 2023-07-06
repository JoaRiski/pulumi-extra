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
  ExtraPort,
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
import { apps } from "@pulumi/kubernetes/types/input";
import DeploymentStrategy = apps.v1.DeploymentStrategy;

interface StackArgs extends CommonArgs {
  domain?: Input<string>;
  letsEncryptIssuer?: Input<string>;
  replicas?: Input<number>;
  livenessPath?: Input<string>;
  readinessPath?: Input<string>;
  livenessProbe?: inputs.core.v1.Probe | null;
  readinessProbe?: inputs.core.v1.Probe | null;
  minAvailable?: Input<number>;
  maxUnavailable?: Input<number>;
  sidecars?: Sidecar[];
  servicePort?: Input<number>;
  extraPorts?: ExtraPort[];
  strategy?: DeploymentStrategy;
  container: {
    env?: ContainerEnv;
    image: Input<string>;
    portNumber?: Input<number>;
    volumeMounts?: Input<Input<inputs.core.v1.VolumeMount>[]>;
    cpu: CpuAllocation;
    memory: MemoryAllocation;
    command?: Input<Input<string>[]>;
    args?: Input<Input<string>[]>;
  };
  imagePullSecrets?: Input<Input<inputs.core.v1.LocalObjectReference>[]>;
  namespace?: k8s.core.v1.Namespace;
  annotations?: Input<{ [key: string]: Input<string> }>;
  labels?: Input<{
    [key: string]: Input<string>;
  }>;
}
export class GenericStack extends ComponentResource {
  readonly labels?: Input<{
    [key: string]: Input<string>;
  }>;
  readonly namespace: k8s.core.v1.Namespace;
  readonly readinessProbe?: inputs.core.v1.Probe | null;
  readonly livenessProbe?: inputs.core.v1.Probe | null;
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
      genericstack: name,
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
    this.readinessProbe =
      args.readinessProbe !== undefined
        ? args.readinessProbe
        : args.domain && args.container.portNumber
        ? CreateHttpProbe({
            path: args.readinessPath || "/healthz",
            host: args.domain,
            port: args.container.portNumber,
          })
        : undefined;
    this.livenessProbe =
      args.livenessProbe !== undefined
        ? args.livenessProbe
        : args.domain && args.container.portNumber
        ? CreateHttpProbe({
            path: args.livenessPath || "/healthz",
            host: args.domain,
            port: args.container.portNumber,
          })
        : undefined;
    this.deployment = CreateDeployment(
      `${name}-dep`,
      {
        replicas: args.replicas ?? 1,
        namespace: this.namespace,
        labels: this.labels,
        livenessProbe: this.livenessProbe ?? undefined,
        readinessProbe: this.readinessProbe ?? undefined,
        portNumber: args.container.portNumber,
        extraPorts: args.extraPorts,
        volumeMounts: args.container.volumeMounts,
        image: args.container.image,
        imagePullSecrets: args.imagePullSecrets,
        sidecars: args.sidecars,
        env: args.container.env,
        cpu: args.container.cpu,
        memory: args.container.memory,
        command: args.container.command,
        args: args.container.args,
        strategy: args.strategy,
        annotations: args.annotations,
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
            portNumber: args.servicePort || 80,
            targetPort: this.deployment.port,
            extraPorts: args.extraPorts,
          },
          childOptions
        )
      : undefined;
    this.ingress =
      this.service && args.domain && args.letsEncryptIssuer
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
