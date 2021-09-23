import { CreateContainerTemplate } from "../../k8s/container";
import {
  NamespacedArgs,
  ServiceAccountSecretVolume,
  Sidecar,
} from "../../types";
import { CustomResourceOptions, Input, interpolate } from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

interface CreateServiceAccountSecretVolumeArgs extends NamespacedArgs {
  serviceAccountBase64: Input<string>;
}
export const CreateServiceAccountSecretVolume = (
  name: string,
  args: CreateServiceAccountSecretVolumeArgs,
  options?: CustomResourceOptions
): ServiceAccountSecretVolume => {
  const serviceAccountFilename = "service_account.json";
  const secret = new k8s.core.v1.Secret(
    name,
    {
      metadata: {
        namespace: args.namespace.metadata.name,
        labels: args.labels,
      },
      data: {
        [serviceAccountFilename]: args.serviceAccountBase64,
      },
    },
    options
  );
  return {
    name: name,
    secret: {
      secretName: secret.metadata.name,
    },
    serviceAccountFilename: serviceAccountFilename,
  };
};

interface CreateSqlProxyTemplateArgs {
  serviceAccountVolume: ServiceAccountSecretVolume;
  databaseConnectionName: Input<string>;
  databasePort: Input<number>;
}
export const CreateSqlProxyTemplate = ({
  serviceAccountVolume,
  databaseConnectionName,
  databasePort,
}: CreateSqlProxyTemplateArgs): Sidecar => {
  const container = CreateContainerTemplate("cloud-sql-proxy", {
    image: "gcr.io/cloudsql-docker/gce-proxy:1.25.0",
    command: [
      "/cloud_sql_proxy",
      interpolate`-instances=${databaseConnectionName}=tcp:${databasePort}`,
      interpolate`-credential_file=/secrets/${serviceAccountVolume.serviceAccountFilename}`,
    ],
    volumeMounts: [
      {
        name: serviceAccountVolume.name,
        mountPath: "/secrets/",
        readOnly: true,
      },
    ],
    securityContext: {
      runAsNonRoot: true,
    },
    cpu: {
      request: "50m",
      limit: "100m",
    },
    memory: {
      request: "50Mi",
      limit: "100Mi",
    },
  });
  return {
    container: container,
    volumes: [serviceAccountVolume],
  };
};
