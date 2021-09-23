import { CommonArgs } from "../types";
import { CustomResourceOptions } from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

export const CreateNamespace = (
  name: string,
  args: CommonArgs,
  options?: CustomResourceOptions
): k8s.core.v1.Namespace => {
  return new k8s.core.v1.Namespace(
    name,
    {
      metadata: { labels: args.labels },
    },
    options
  );
};
