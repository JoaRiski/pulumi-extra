import { NamespacedArgs, ServiceInfo } from "../types";
import { CustomResourceOptions, Input } from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

interface CreateNginxIngressArgs extends NamespacedArgs {
  letsEncryptIssuer: Input<string>;
  serviceInfo: ServiceInfo;
  domain: Input<string>;
}

export const CreateNginxIngress = (
  name: string,
  {
    namespace,
    letsEncryptIssuer,
    serviceInfo,
    domain,
    labels,
  }: CreateNginxIngressArgs,
  options?: CustomResourceOptions
): k8s.networking.v1.Ingress => {
  return new k8s.networking.v1.Ingress(
    name,
    {
      metadata: {
        namespace: namespace.metadata.name,
        labels: labels,
        annotations: {
          "kubernetes.io/ingress.class": "nginx",
          "nginx.ingress.kubernetes.io/proxy-body-size": "10m",
          "nginx.org/client-max-body-size": "10m",
          "nginx.ingress.kubernetes.io/proxy-buffering": "on",
          "nginx.ingress.kubernetes.io/proxy-request-buffering": "on",
          "nginx.ingress.kubernetes.io/proxy-max-temp-file-size": "1024m",
          "cert-manager.io/cluster-issuer": letsEncryptIssuer,
        },
      },
      spec: {
        tls: [
          {
            hosts: [domain],
            secretName: `${name}-tls`,
          },
        ],
        rules: [
          {
            host: domain,
            http: {
              paths: [
                {
                  path: "/",
                  pathType: "Prefix",
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
