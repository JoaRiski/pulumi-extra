import { CustomResourceOptions, Input, interpolate } from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import { CommonArgs } from "../types";

interface CreateDnsRecordsArgs extends CommonArgs {
  dnsZoneName: Input<string>;
  domain: Input<string>;
  address: gcp.compute.GlobalAddress;
}

export const CreateDnsRecords = (
  name: string,
  { dnsZoneName, domain, address }: CreateDnsRecordsArgs,
  options?: CustomResourceOptions
): gcp.dns.RecordSet => {
  return new gcp.dns.RecordSet(
    name,
    {
      managedZone: dnsZoneName,
      name: interpolate`${domain}.`,
      type: "A",
      rrdatas: [address.address],
      ttl: 600,
    },
    options
  );
};
