import { Input } from "@pulumi/pulumi";
import {
  ContainerEnv,
  ContainerPort,
  CpuAllocation,
  ExtraPort,
  MemoryAllocation,
} from "../types";
import { input as inputs } from "@pulumi/kubernetes/types";

interface CreateContainerTemplateArgs {
  image: Input<string>;
  command?: Input<Input<string>[]>;
  args?: Input<Input<string>[]>;
  env?: ContainerEnv;
  port?: ContainerPort;
  extraPorts?: ExtraPort[];
  cpu: CpuAllocation;
  memory: MemoryAllocation;
  volumeMounts?: Input<Input<inputs.core.v1.VolumeMount>[]>;
  securityContext?: Input<inputs.core.v1.SecurityContext>;
  livenessProbe?: Input<inputs.core.v1.Probe>;
  readinessProbe?: Input<inputs.core.v1.Probe>;
}

export const CreateContainerTemplate = (
  name: string,
  {
    image,
    command,
    args,
    env,
    port,
    extraPorts,
    cpu,
    memory,
    volumeMounts,
    securityContext,
    livenessProbe,
    readinessProbe,
  }: CreateContainerTemplateArgs
): inputs.core.v1.Container => {
  const ports = port ? [{ name: port.name, containerPort: port.port }] : [];
  const envFrom: inputs.core.v1.EnvFromSource[] = [];
  if (env && env.config) {
    envFrom.push({ configMapRef: { name: env.config.metadata.name } });
  }
  if (env && env.secret) {
    envFrom.push({ secretRef: { name: env.secret.metadata.name } });
  }

  for (const x of extraPorts || []) {
    ports.push({
      containerPort: x.port,
      name: x.name,
    });
  }

  return {
    name: name,
    image: image,
    command: command,
    args: args,
    ports: ports,
    volumeMounts: volumeMounts,
    securityContext: securityContext,
    livenessProbe: livenessProbe,
    readinessProbe: readinessProbe,
    envFrom: envFrom.length > 0 ? envFrom : undefined,
    resources: {
      requests: {
        cpu: cpu.request,
        memory: memory.request,
      },
      limits: {
        cpu: cpu.limit,
        memory: memory.limit,
      },
    },
  };
};
