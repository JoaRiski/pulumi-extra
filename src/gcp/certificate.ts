import { NamespacedArgs } from "../types";
import * as gcp from "@pulumi/gcp";
import { CustomResourceOptions } from "@pulumi/pulumi";
import { ManagedCertificate } from "./gke/certificate";
import * as _ from "lodash";

interface CreateCertificateArgs extends NamespacedArgs {
  dnsRecords: gcp.dns.RecordSet;
}

export const CreateCertificate = (
  name: string,
  { namespace, dnsRecords, labels }: CreateCertificateArgs,
  options?: CustomResourceOptions
): ManagedCertificate => {
  return new ManagedCertificate(
    name,
    {
      namespace: namespace.metadata.name,
      domains: [dnsRecords.name.apply((name) => _.trimEnd(name, "."))],
      labels: labels,
    },
    options
  );
};
