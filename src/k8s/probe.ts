import { Input } from "@pulumi/pulumi";
import { input as inputs } from "@pulumi/kubernetes/types";

interface CreateHttpProbeArgs {
  path: Input<string>;
  port: Input<number>;
  host: Input<string>;
}

export const CreateHttpProbe = ({
  path,
  port,
  host,
}: CreateHttpProbeArgs): inputs.core.v1.Probe => {
  return {
    httpGet: {
      scheme: "HTTP",
      path: path,
      port: port,
      httpHeaders: [
        {
          name: "Host",
          value: host,
        },
      ],
    },
    initialDelaySeconds: 5,
    periodSeconds: 15,
    failureThreshold: 3,
  };
};
