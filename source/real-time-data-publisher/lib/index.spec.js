// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// Mock AWS SDK
const mockAWS = require("aws-sdk");
const mockIotData = {
  publish: jest.fn(),
};
mockAWS.IotData = jest.fn(() => ({
  publish: mockIotData.publish,
}));

//required modules
const util = require("util");
const zlib = require("zlib");

//spy zlib.gunzip
jest.spyOn(zlib, "gunzip");

//env variables and lambda package
process.env = {
  IOT_ENDPOINT: "test.endpoint",
  MAIN_REGION: "test-region-1",
  VERSION: "3.x.x",
  SOLUTION_ID: "sO0062",
  AWS_REGION: "test-region-2",
};
const lambda = require("../index.js");

//turn zlib.gzip into a promise
const zip = util.promisify(zlib.gzip);

//event parameters
const eventData = JSON.stringify({
  messageType: "DATA_MESSAGE",
  owner: "1234",
  logGroup: "fake-log-group",
  logStream: "load-testing/fake-dlt-load-tester/1234",
  subscriptionFilters: ["dlt-filter"],
  logEvents: [
    {
      id: "36658745263028322096775493507662137474727159327305236480",
      timestamp: 1643834990117,
      message:
        "zlppmfYHww 20:49:50 INFO: Current: 100 vu\t58 succ\t0 fail\t3.631 avg rt\t/\tCumulative: 5.374 avg rt, 0% failures",
    },
    {
      id: "36658745284905353136534034809508677100195201964672024577",
      timestamp: 1643834991098,
      message:
        "zlppmfYHww 20:49:51 INFO: Current: 100 vu\t27 succ\t0 fail\t3.916 avg rt\t/\tCumulative: 5.353 avg rt, 0% failures",
    },
  ],
});
const event = {
  awslogs: {
    data: "placeholder",
  },
};

//expected data
const resultData = [
  {
    testId: "zlppmfYHww",
    vu: 100,
    succ: 58,
    fail: 0,
    avgRt: 3.631,
    timestamp: 1643834990000,
  },
  {
    testId: "zlppmfYHww",
    vu: 100,
    succ: 27,
    fail: 0,
    avgRt: 3.916,
    timestamp: 1643834991000,
  },
];
const topic = "dlt/zlppmfYHww";

describe("#REAL TIME DATA PUBLISHER:: ", () => {
  beforeEach(() => {
    //reset iot mock before each test
    mockIotData.publish.mockReset();
  });
  beforeAll(async () => {
    //zip and encode event data once before all tests
    const zippedEventData = await zip(eventData);
    event.awslogs.data = Buffer.from(zippedEventData, "binary").toString("base64");
  });
  it("Should call publish with correct data", async () => {
    //mock IoT publish call
    mockIotData.publish.mockImplementationOnce(() => ({
      promise() {
        return Promise.resolve({});
      },
    }));

    //test lambda
    await lambda.handler(event);
    const expectedResult = {
      payload: JSON.stringify({ [process.env.AWS_REGION]: resultData }),
      topic: topic,
    };
    expect(mockIotData.publish).toHaveBeenCalledWith(expectedResult);
  });
  it("Should fail if zlib.gunzip fails", async () => {
    //mock zlib.gunzip
    zlib.gunzip.mockImplementationOnce((buffer, callback) => {
      callback("Error", null);
    });

    //test lambda
    try {
      await lambda.handler(event);
    } catch (error) {
      expect(error).toBe("Error");
    }
  });
  it("Should fail if publishing to IoT endpoint fails", async () => {
    //mock IoT publish failure
    mockIotData.publish.mockImplementationOnce(() => ({
      promise() {
        return Promise.reject("Error");
      },
    }));

    //test lambda
    try {
      await lambda.handler(event);
    } catch (error) {
      expect(error).toBe("Error");
    }
  });
});
