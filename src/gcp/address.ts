import { CommonArgs } from "../types";
import { CustomResourceOptions } from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";

export const CreateAddress = (
  name: string,
  args: CommonArgs,
  options?: CustomResourceOptions
): gcp.compute.GlobalAddress => {
  return new gcp.compute.GlobalAddress(name, { labels: args.labels }, options);
};
