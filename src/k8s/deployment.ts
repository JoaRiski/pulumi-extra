import {
  ContainerEnv,
  CpuAllocation,
  DeploymentInfo,
  ExtraPort,
  MemoryAllocation,
  NamespacedArgs,
  Sidecar,
} from "../types";
import { CustomResourceOptions, Input } from "@pulumi/pulumi";
import { input as inputs } from "@pulumi/kubernetes/types";
import * as k8s from "@pulumi/kubernetes";
import { CreatePodSpec } from "./pod";

interface CreateDeploymentArgs extends NamespacedArgs {
  image: Input<string>;
  env?: ContainerEnv;
  portNumber?: Input<number>;
  extraPorts?: ExtraPort[];
  cpu: CpuAllocation;
  memory: MemoryAllocation;
  replicas: Input<number>;
  sidecars?: Sidecar[];
  livenessProbe?: Input<inputs.core.v1.Probe>;
  readinessProbe?: Input<inputs.core.v1.Probe>;
  command?: Input<Input<string>[]>;
  args?: Input<Input<string>[]>;
}

export const CreateDeployment = (
  name: string,
  {
    namespace,
    image,
    env,
    portNumber,
    extraPorts,
    labels,
    cpu,
    memory,
    replicas,
    sidecars,
    livenessProbe,
    readinessProbe,
    command,
    args,
  }: CreateDeploymentArgs,
  options?: CustomResourceOptions
): DeploymentInfo => {
  const pod = CreatePodSpec(`${name}-cont`, {
    image,
    env,
    portNumber,
    extraPorts,
    cpu,
    memory,
    sidecars,
    livenessProbe,
    readinessProbe,
    command,
    args,
  });
  const deployment = new k8s.apps.v1.Deployment(
    name,
    {
      metadata: {
        namespace: namespace.metadata.name,
        labels: labels,
      },
      spec: {
        replicas: replicas,
        selector: {
          matchLabels: labels,
        },
        template: {
          metadata: {
            labels: labels,
          },
          spec: pod.spec,
        },
      },
    },
    options
  );
  return {
    port: pod.port || undefined,
    deployment: deployment,
  };
};
