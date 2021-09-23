import * as k8s from "@pulumi/kubernetes";
import { Input, Output } from "@pulumi/pulumi";
import { input as inputs } from "@pulumi/kubernetes/types";

export type Port<T extends string> = {
  type: T;
  name: string;
  port: Input<number>;
  protocol?: string;
};
export type ContainerPort = Port<"Container">;
export type ServicePort = Port<"Service">;
export type DeploymentInfo = {
  port?: ContainerPort;
  deployment: k8s.apps.v1.Deployment;
};
export type ServiceInfo = {
  port: ServicePort;
  service: k8s.core.v1.Service;
};
export type CommonArgs = {
  labels?: Input<{
    [key: string]: Input<string>;
  }>;
};
export type NamespacedArgs = CommonArgs & {
  namespace: k8s.core.v1.Namespace;
};

export interface CpuAllocation {
  request: Input<string>;
  limit: Input<string>;
}

export interface MemoryAllocation {
  request: Input<string>;
  limit: Input<string>;
}

export interface ContainerEnv {
  config?: k8s.core.v1.ConfigMap;
  secret?: k8s.core.v1.Secret;
}

export interface SecretVolume {
  name: Input<string>;
  secret: {
    secretName: Output<string>;
  };
}
export interface ServiceAccountSecretVolume extends SecretVolume {
  serviceAccountFilename: string;
}

export interface Sidecar {
  container: inputs.core.v1.Container;
  volumes: SecretVolume[];
}

export interface PodSpec {
  spec: inputs.core.v1.PodSpec;
  port?: ContainerPort;
}
