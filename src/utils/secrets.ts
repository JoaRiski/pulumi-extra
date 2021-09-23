import * as pulumi from "@pulumi/pulumi";
import * as _ from "lodash";

export const encodeSecrets = (secrets: {
  [key: string]: pulumi.Input<string>;
}) => {
  return _.mapValues(secrets, (val) => {
    return pulumi
      .output(val)
      .apply((val) => Buffer.from(val).toString("base64"));
  });
};
