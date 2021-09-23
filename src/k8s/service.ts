import {
  ContainerPort,
  NamespacedArgs,
  ServiceInfo,
  ServicePort,
} from "../types";
import { CustomResourceOptions, Input } from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

interface CreateServiceArgs extends NamespacedArgs {
  portNumber: Input<number>;
  targetPort: ContainerPort;
}

export const CreateService = (
  name: string,
  { namespace, labels, portNumber, targetPort }: CreateServiceArgs,
  options?: CustomResourceOptions
): ServiceInfo => {
  const port: ServicePort = {
    type: "Service",
    name: "svc-port",
    port: portNumber,
  };
  const service = new k8s.core.v1.Service(
    name,
    {
      metadata: {
        namespace: namespace.metadata.name,
        labels: labels,
      },
      spec: {
        ports: [
          {
            protocol: port.protocol,
            port: port.port,
            targetPort: targetPort.name,
            name: port.name,
          },
        ],
        type: "NodePort",
        selector: labels,
      },
    },
    options
  );
  return {
    service: service,
    port: port,
  };
};
