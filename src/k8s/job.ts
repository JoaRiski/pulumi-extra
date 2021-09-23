import * as k8s from "@pulumi/kubernetes";
import { CustomResourceOptions, Input } from "@pulumi/pulumi";
import {
  ContainerEnv,
  CpuAllocation,
  MemoryAllocation,
  Sidecar,
} from "../types";
import { CreatePodSpec } from "./pod";

interface CreateJobArgs {
  namespace: k8s.core.v1.Namespace;
  labels?: Input<{
    [key: string]: Input<string>;
  }>;
  sidecars?: Sidecar[];
  container: {
    env?: ContainerEnv;
    image: Input<string>;
    cpu: CpuAllocation;
    memory: MemoryAllocation;
    command?: Input<Input<string>[]>;
  };
  shareProcessNamespace?: Input<boolean>;
  restartPolicy?: "OnFailure" | "Never";
  backoffLimit?: Input<number>;
  ttlSecondsAfterFinished?: Input<number>;
}
export const CreateJob = (
  name: string,
  args: CreateJobArgs,
  options?: CustomResourceOptions
): k8s.batch.v1.Job => {
  const pod = CreatePodSpec(`${name}-cont`, {
    image: args.container.image,
    command: args.container.command,
    env: args.container.env,
    cpu: args.container.cpu,
    memory: args.container.memory,
    sidecars: args.sidecars,
    restartPolicy: args.restartPolicy || "OnFailure",
    shareProcessNamespace: args.shareProcessNamespace,
  });
  return new k8s.batch.v1.Job(
    name,
    {
      metadata: {
        namespace: args.namespace.metadata.name,
        labels: args.labels,
      },
      spec: {
        template: {
          metadata: {
            labels: args.labels,
          },
          spec: pod.spec,
        },
        backoffLimit: args.backoffLimit,
        ttlSecondsAfterFinished: args.ttlSecondsAfterFinished,
      },
    },
    options
  );
};
