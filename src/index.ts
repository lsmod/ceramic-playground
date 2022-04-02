import { DID } from "dids";
import { getResolver } from "key-did-resolver";
import { Ed25519Provider } from "key-did-provider-ed25519";
import CeramicClient from "@ceramicnetwork/http-client";
import { TileDocument } from "@ceramicnetwork/stream-tile";
import { StreamID } from "@ceramicnetwork/streamid";
const API_URL = "https://ceramic-clay.3boxlabs.com";

async function resolveDID(didKey: string) {
  const did = new DID({ resolver: getResolver() });
  return await did.resolve(didKey);
}

function createCeramicClient() {
  return new CeramicClient(API_URL);
}

async function createDocument(ceramic: CeramicClient, content: any) {
  // The following call will fail if the Ceramic instance does not have an authenticated DID
  const doc = await TileDocument.create(ceramic, content);
  // The stream ID of the created document can then be accessed as the `id` property
  return doc.id;
}

async function loadDocument(ceramic: CeramicClient, id: StreamID) {
  return await TileDocument.load(ceramic, id);
}

// return a did authentification to be use by ceramic client
// `seed` must be a 32-byte long Uint8Array
async function authenticateDID(seed: Uint8Array) {
  const provider = new Ed25519Provider(seed);
  const did = new DID({ provider, resolver: getResolver() });
  await did.authenticate();
  return did;
}

function typeDocument(doc: unknown): any {
  if (typeof doc === "object") {
    // Within this branch, `value` has type `Function`,
    // so we can access the function's `name` property

    return { ...doc };
  }

  return {};
}

const main = async () => {
  // let's get informations about this did (resolved it)
  const resolved = await resolveDID(
    "did:key:z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwWsdvktH"
  );
  console.log("resolved did:\n", resolved);

  // let's create a new did (from a seed)
  const seed = new Uint8Array(32); // shoud use random bytes
  const newDid = await authenticateDID(seed);
  console.log("authenticateDID:\n", newDid.id);
  const resolved2 = await resolveDID(newDid.id);
  console.log("resolved did:\n", resolved2);

  const ceramic = createCeramicClient();
  ceramic.did = newDid;
  console.log("client", ceramic);
  const documentId = await createDocument(ceramic, { test: "123" });
  console.log("documentId:", documentId);

  const loadedDocument = await loadDocument(ceramic, documentId);
  console.log("loadedDocument", loadedDocument);
  console.log(loadedDocument.content);

  // let's update our document
  await loadedDocument.update({
    ...typeDocument(loadedDocument.content),
    updated: true,
  });
  // read updated document
  const loadedAgain = await loadDocument(ceramic, documentId);
  console.log("loadedAgain", loadedAgain);
  console.log(loadedAgain.content);
  // let's change did an try to update document (it should fail)

  const seed2 = new Uint8Array([
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    10,
    11,
    12,
    13,
    14,
    15,
    16,
    17,
    18,
    19,
    20,
    21,
    22,
    23,
    24,
    25,
    26,
    27,
    28,
    29,
    30,
    31,
    32,
  ]); // shoud use random bytes
  const otherDid = await authenticateDID(seed2);
  console.log("authenticateDID:\n", otherDid.id);
  const resolved3 = await resolveDID(otherDid.id);
  ceramic.did = otherDid;
  console.log("resolved did:\n", resolved3);
  // let's ensure I can create a doc with this new did
  const document2Id = await createDocument(ceramic, { test: "123" });
  console.log("documentId:", document2Id);
  try {
    // let's try to update our with a did that not the doc owner
    await loadedDocument.update({
      ...typeDocument(loadedDocument.content),
      updated: true,
      pwned: true,
    });
  } catch (e) {
    console.log(
      "As expected I couldn't update this document that otherDid doesn't own"
    );
  }
  // read updated document
  const loadedAgain2 = await loadDocument(ceramic, documentId);
  console.log("loadedAgain", loadedAgain2);
  console.log(loadedAgain2.content);

  // let's try to load without being an authenticated did
  const notAuthCeramic = createCeramicClient();
  const doc = await loadDocument(notAuthCeramic, documentId);
  console.log("doc content:", doc.content);
};
main();