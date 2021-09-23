import { NamespacedArgs, ServiceInfo } from "../types";
import * as gcp from "@pulumi/gcp";
import { ManagedCertificate } from "../gcp/gke";
import { CustomResourceOptions, Input } from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

interface CreateIngressArgs extends NamespacedArgs {
  address: gcp.compute.GlobalAddress;
  certificate: ManagedCertificate;
  serviceInfo: ServiceInfo;
  domain: Input<string>;
}

export const CreateIngress = (
  name: string,
  {
    namespace,
    address,
    certificate,
    serviceInfo,
    domain,
    labels,
  }: CreateIngressArgs,
  options?: CustomResourceOptions
): k8s.networking.v1.Ingress => {
  return new k8s.networking.v1.Ingress(
    name,
    {
      metadata: {
        namespace: namespace.metadata.name,
        labels: labels,
        annotations: {
          "kubernetes.io/ingress.global-static-ip-name": address.name,
          "networking.gke.io/managed-certificates": certificate.metadata.name,
          "kubernetes.io/ingress.allow-http": "false",
          "kubernetes.io/ingress.class": "gce",
        },
      },
      spec: {
        rules: [
          {
            host: domain,
            http: {
              paths: [
                {
                  path: "/*",
                  pathType: "ImplementationSpecific",
                  backend: {
                    service: {
                      name: serviceInfo.service.metadata.name,
                      port: {
                        name: serviceInfo.port.name,
                      },
                    },
                  },
                },
              ],
            },
          },
        ],
        defaultBackend: {
          service: {
            name: serviceInfo.service.metadata.name,
            port: {
              name: serviceInfo.port.name,
            },
          },
        },
      },
    },
    options
  );
};
