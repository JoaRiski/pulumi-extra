import { CustomResource } from "@pulumi/kubernetes/apiextensions";
import { CustomResourceOptions, Input } from "@pulumi/pulumi";

interface ManagedCertificateArgs {
  namespace: Input<string>;
  domains: Input<Input<string>[]>;
  labels?: Input<{ [key: string]: Input<string> }>;
}
export class ManagedCertificate extends CustomResource {
  constructor(
    name: string,
    args: ManagedCertificateArgs,
    opts?: CustomResourceOptions
  ) {
    super(
      name,
      {
        apiVersion: "networking.gke.io/v1",
        kind: "ManagedCertificate",
        metadata: {
          namespace: args.namespace,
        },
        spec: {
          domains: args.domains,
        },
      },
      opts
    );
  }
}
