// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Template } from "aws-cdk-lib/assertions";
import { App, DefaultStackSynthesizer, Stack } from "aws-cdk-lib";

import { CognitoAuthConstruct } from "../lib/front-end/auth";

test("DLT API Test", () => {
  const app = new App();
  const stack = new Stack(app, "DLTStack", {
    synthesizer: new DefaultStackSynthesizer({
      generateBootstrapVersionRule: false,
    }),
  });

  const auth = new CognitoAuthConstruct(stack, "TestAuth", {
    adminEmail: "test@test.com",
    adminName: "testname",
    apiId: "apiId12345",
    cloudFrontDomainName: "test.com",
    scenariosBucketArn: "arn:aws:s3:::DOC-EXAMPLE-BUCKET",
  });

  expect(Template.fromStack(stack)).toMatchSnapshot();
  expect(auth.cognitoIdentityPoolId).toBeDefined();
  expect(auth.cognitoUserPoolClientId).toBeDefined();
  expect(auth.cognitoUserPoolId).toBeDefined();
});
