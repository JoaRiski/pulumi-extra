import { NamespacedArgs } from "../types";
import { CustomResourceOptions, Input } from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

interface CreatePodDisruptionBudgetargs extends NamespacedArgs {
  minAvailable?: Input<number>;
  maxUnavailable?: Input<number>;
  matchLabels: Input<{
    [key: string]: Input<string>;
  }>;
}
export const CreatePodDisruptionBudget = (
  name: string,
  args: CreatePodDisruptionBudgetargs,
  options?: CustomResourceOptions
) => {
  return new k8s.policy.v1beta1.PodDisruptionBudget(
    name,
    {
      metadata: {
        labels: args.labels,
        namespace: args.namespace.metadata.name,
      },
      spec: {
        minAvailable: args.minAvailable,
        maxUnavailable: args.maxUnavailable,
        selector: {
          matchLabels: args.matchLabels,
        },
      },
    },
    options
  );
};
