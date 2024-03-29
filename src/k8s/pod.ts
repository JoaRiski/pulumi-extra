import { Input } from "@pulumi/pulumi";
import {
  ContainerEnv,
  ContainerPort,
  CpuAllocation,
  ExtraPort,
  MemoryAllocation,
  PodSpec,
  Sidecar,
} from "../types";
import { input as inputs } from "@pulumi/kubernetes/types";
import * as _ from "lodash";
import { CreateContainerTemplate } from "./container";

interface CreatePodSpecArgs {
  image: Input<string>;
  imagePullSecrets?: Input<Input<inputs.core.v1.LocalObjectReference>[]>;
  command?: Input<Input<string>[]>;
  args?: Input<Input<string>[]>;
  env?: ContainerEnv;
  portNumber?: Input<number>;
  extraPorts?: ExtraPort[];
  volumeMounts?: Input<Input<inputs.core.v1.VolumeMount>[]>;
  cpu: CpuAllocation;
  memory: MemoryAllocation;
  sidecars?: Sidecar[];
  livenessProbe?: Input<inputs.core.v1.Probe>;
  readinessProbe?: Input<inputs.core.v1.Probe>;
  restartPolicy?: Input<string>;
  shareProcessNamespace?: Input<boolean>;
}

export const CreatePodSpec = (
  name: string,
  args: CreatePodSpecArgs
): PodSpec => {
  const port: ContainerPort | undefined = args.portNumber
    ? {
        type: "Container",
        name: "cont-port",
        port: args.portNumber,
      }
    : undefined;
  const volumes = args.sidecars
    ? _.flatten(args.sidecars.map((y) => y.volumes))
    : undefined;
  const containers = [
    CreateContainerTemplate(name, {
      image: args.image,
      command: args.command,
      args: args.args,
      env: args.env,
      port: port,
      extraPorts: args.extraPorts,
      volumeMounts: args.volumeMounts,
      cpu: args.cpu,
      memory: args.memory,
      livenessProbe: args.livenessProbe,
      readinessProbe: args.readinessProbe,
    }),
  ];
  for (const sidecar of args.sidecars || []) {
    containers.push(sidecar.container);
  }
  return {
    spec: {
      containers: containers,
      imagePullSecrets: args.imagePullSecrets,
      volumes: volumes,
      restartPolicy: args.restartPolicy,
      shareProcessNamespace: args.shareProcessNamespace,
    },
    port: port,
  };
};
