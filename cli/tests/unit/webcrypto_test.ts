import { assert, assertEquals, assertRejects } from "./test_util.ts";

// https://github.com/denoland/deno/issues/11664
Deno.test(async function testImportArrayBufferKey() {
  const subtle = window.crypto.subtle;
  assert(subtle);

  // deno-fmt-ignore
  const key = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);

  const cryptoKey = await subtle.importKey(
    "raw",
    key.buffer,
    { name: "HMAC", hash: "SHA-1" },
    true,
    ["sign"],
  );
  assert(cryptoKey);

  // Test key usage
  await subtle.sign({ name: "HMAC" }, cryptoKey, new Uint8Array(8));
});

// TODO(@littledivy): Remove this when we enable WPT for sign_verify
Deno.test(async function testSignVerify() {
  const subtle = window.crypto.subtle;
  assert(subtle);
  for (const algorithm of ["RSA-PSS", "RSASSA-PKCS1-v1_5"]) {
    for (
      const hash of [
        "SHA-1",
        "SHA-256",
        "SHA-384",
        "SHA-512",
      ]
    ) {
      const keyPair = await subtle.generateKey(
        {
          name: algorithm,
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash,
        },
        true,
        ["sign", "verify"],
      );

      const data = new Uint8Array([1, 2, 3]);

      const signAlgorithm = { name: algorithm, saltLength: 32 };

      const signature = await subtle.sign(
        signAlgorithm,
        keyPair.privateKey,
        data,
      );

      assert(signature);
      assert(signature.byteLength > 0);
      assert(signature.byteLength % 8 == 0);
      assert(signature instanceof ArrayBuffer);

      const verified = await subtle.verify(
        signAlgorithm,
        keyPair.publicKey,
        signature,
        data,
      );
      assert(verified);
    }
  }
});

// deno-fmt-ignore
const plainText = new Uint8Array([95, 77, 186, 79, 50, 12, 12, 232, 118, 114, 90, 252, 229, 251, 210, 91, 248, 62, 90, 113, 37, 160, 140, 175, 231, 60, 62, 186, 196, 33, 119, 157, 249, 213, 93, 24, 12, 58, 233, 148, 38, 69, 225, 216, 47, 238, 140, 157, 41, 75, 60, 177, 160, 138, 153, 49, 32, 27, 60, 14, 129, 252, 71, 202, 207, 131, 21, 162, 175, 102, 50, 65, 19, 195, 182, 98, 48, 195, 70, 8, 196, 244, 89, 54, 52, 206, 2, 178, 103, 54, 34, 119, 240, 168, 64, 202, 116, 188, 61, 26, 98, 54, 149, 44, 94, 215, 170, 248, 168, 254, 203, 221, 250, 117, 132, 230, 151, 140, 234, 93, 42, 91, 159, 183, 241, 180, 140, 139, 11, 229, 138, 48, 82, 2, 117, 77, 131, 118, 16, 115, 116, 121, 60, 240, 38, 170, 238, 83, 0, 114, 125, 131, 108, 215, 30, 113, 179, 69, 221, 178, 228, 68, 70, 255, 197, 185, 1, 99, 84, 19, 137, 13, 145, 14, 163, 128, 152, 74, 144, 25, 16, 49, 50, 63, 22, 219, 204, 157, 107, 225, 104, 184, 72, 133, 56, 76, 160, 62, 18, 96, 10, 193, 194, 72, 2, 138, 243, 114, 108, 201, 52, 99, 136, 46, 168, 192, 42, 171]);

// Passing
const hashPlainTextVector = [
  {
    hash: "SHA-1",
    plainText: plainText.slice(0, 214),
  },
  {
    hash: "SHA-256",
    plainText: plainText.slice(0, 190),
  },
  {
    hash: "SHA-384",
    plainText: plainText.slice(0, 158),
  },
  {
    hash: "SHA-512",
    plainText: plainText.slice(0, 126),
  },
];

// TODO(@littledivy): Remove this when we enable WPT for encrypt_decrypt
Deno.test(async function testEncryptDecrypt() {
  const subtle = window.crypto.subtle;
  assert(subtle);
  for (
    const { hash, plainText } of hashPlainTextVector
  ) {
    const keyPair = await subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash,
      },
      true,
      ["encrypt", "decrypt"],
    );

    const encryptAlgorithm = { name: "RSA-OAEP" };
    const cipherText = await subtle.encrypt(
      encryptAlgorithm,
      keyPair.publicKey,
      plainText,
    );

    assert(cipherText);
    assert(cipherText.byteLength > 0);
    assertEquals(cipherText.byteLength * 8, 2048);
    assert(cipherText instanceof ArrayBuffer);

    const decrypted = await subtle.decrypt(
      encryptAlgorithm,
      keyPair.privateKey,
      cipherText,
    );
    assert(decrypted);
    assert(decrypted instanceof ArrayBuffer);
    assertEquals(new Uint8Array(decrypted), plainText);

    const badPlainText = new Uint8Array(plainText.byteLength + 1);
    badPlainText.set(plainText, 0);
    badPlainText.set(new Uint8Array([32]), plainText.byteLength);
    await assertRejects(async () => {
      // Should fail
      await subtle.encrypt(
        encryptAlgorithm,
        keyPair.publicKey,
        badPlainText,
      );
      throw new TypeError("unreachable");
    }, DOMException);
  }
});

Deno.test(async function testGenerateRSAKey() {
  const subtle = window.crypto.subtle;
  assert(subtle);

  const keyPair = await subtle.generateKey(
    {
      name: "RSA-PSS",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  );

  assert(keyPair.privateKey);
  assert(keyPair.publicKey);
  assertEquals(keyPair.privateKey.extractable, true);
  assert(keyPair.privateKey.usages.includes("sign"));
});

Deno.test(async function testGenerateHMACKey() {
  const key = await window.crypto.subtle.generateKey(
    {
      name: "HMAC",
      hash: "SHA-512",
    },
    true,
    ["sign", "verify"],
  );

  assert(key);
  assertEquals(key.extractable, true);
  assert(key.usages.includes("sign"));
});

Deno.test(async function testECDSASignVerify() {
  const key = await window.crypto.subtle.generateKey(
    {
      name: "ECDSA",
      namedCurve: "P-384",
    },
    true,
    ["sign", "verify"],
  );

  const encoder = new TextEncoder();
  const encoded = encoder.encode("Hello, World!");
  const signature = await window.crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-384" },
    key.privateKey,
    encoded,
  );

  assert(signature);
  assert(signature instanceof ArrayBuffer);

  const verified = await window.crypto.subtle.verify(
    { hash: { name: "SHA-384" }, name: "ECDSA" },
    key.publicKey,
    signature,
    encoded,
  );
  assert(verified);
});

// Tests the "bad paths" as a temporary replacement for sign_verify/ecdsa WPT.
Deno.test(async function testECDSASignVerifyFail() {
  const key = await window.crypto.subtle.generateKey(
    {
      name: "ECDSA",
      namedCurve: "P-384",
    },
    true,
    ["sign", "verify"],
  );

  const encoded = new Uint8Array([1]);
  // Signing with a public key (InvalidAccessError)
  await assertRejects(async () => {
    await window.crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-384" },
      key.publicKey,
      new Uint8Array([1]),
    );
    throw new TypeError("unreachable");
  }, DOMException);

  // Do a valid sign for later verifying.
  const signature = await window.crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-384" },
    key.privateKey,
    encoded,
  );

  // Verifying with a private key (InvalidAccessError)
  await assertRejects(async () => {
    await window.crypto.subtle.verify(
      { hash: { name: "SHA-384" }, name: "ECDSA" },
      key.privateKey,
      signature,
      encoded,
    );
    throw new TypeError("unreachable");
  }, DOMException);
});

// https://github.com/denoland/deno/issues/11313
Deno.test(async function testSignRSASSAKey() {
  const subtle = window.crypto.subtle;
  assert(subtle);

  const keyPair = await subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  );

  assert(keyPair.privateKey);
  assert(keyPair.publicKey);
  assertEquals(keyPair.privateKey.extractable, true);
  assert(keyPair.privateKey.usages.includes("sign"));

  const encoder = new TextEncoder();
  const encoded = encoder.encode("Hello, World!");

  const signature = await window.crypto.subtle.sign(
    { name: "RSASSA-PKCS1-v1_5" },
    keyPair.privateKey,
    encoded,
  );

  assert(signature);
});

// deno-fmt-ignore
const rawKey = new Uint8Array([
  1, 2, 3, 4, 5, 6, 7, 8,
  9, 10, 11, 12, 13, 14, 15, 16
]);

const jwk: JsonWebKey = {
  kty: "oct",
  // unpadded base64 for rawKey.
  k: "AQIDBAUGBwgJCgsMDQ4PEA",
  alg: "HS256",
  ext: true,
  "key_ops": ["sign"],
};

Deno.test(async function subtleCryptoHmacImportExport() {
  const key1 = await crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "HMAC", hash: "SHA-256" },
    true,
    ["sign"],
  );
  const key2 = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "HMAC", hash: "SHA-256" },
    true,
    ["sign"],
  );
  const actual1 = await crypto.subtle.sign(
    { name: "HMAC" },
    key1,
    new Uint8Array([1, 2, 3, 4]),
  );

  const actual2 = await crypto.subtle.sign(
    { name: "HMAC" },
    key2,
    new Uint8Array([1, 2, 3, 4]),
  );
  // deno-fmt-ignore
  const expected = new Uint8Array([
    59, 170, 255, 216, 51, 141, 51, 194,
    213, 48, 41, 191, 184, 40, 216, 47,
    130, 165, 203, 26, 163, 43, 38, 71,
    23, 122, 222, 1, 146, 46, 182, 87,
  ]);
  assertEquals(
    new Uint8Array(actual1),
    expected,
  );
  assertEquals(
    new Uint8Array(actual2),
    expected,
  );

  const exportedKey1 = await crypto.subtle.exportKey("raw", key1);
  assertEquals(new Uint8Array(exportedKey1), rawKey);

  const exportedKey2 = await crypto.subtle.exportKey("jwk", key2);
  assertEquals(exportedKey2, jwk);
});

// https://github.com/denoland/deno/issues/12085
Deno.test(async function generateImportHmacJwk() {
  const key = await crypto.subtle.generateKey(
    {
      name: "HMAC",
      hash: "SHA-512",
    },
    true,
    ["sign"],
  );
  assert(key);
  assertEquals(key.type, "secret");
  assertEquals(key.extractable, true);
  assertEquals(key.usages, ["sign"]);

  const exportedKey = await crypto.subtle.exportKey("jwk", key);
  assertEquals(exportedKey.kty, "oct");
  assertEquals(exportedKey.alg, "HS512");
  assertEquals(exportedKey.key_ops, ["sign"]);
  assertEquals(exportedKey.ext, true);
  assert(typeof exportedKey.k == "string");
  assertEquals(exportedKey.k.length, 171);
});

// 2048-bits publicExponent=65537
const pkcs8TestVectors = [
  // rsaEncryption
  { pem: "cli/tests/testdata/webcrypto/id_rsaEncryption.pem", hash: "SHA-256" },
  // id-RSASSA-PSS (sha256)
  // `openssl genpkey -algorithm rsa-pss -pkeyopt rsa_pss_keygen_md:sha256 -out id_rsassaPss.pem`
  { pem: "cli/tests/testdata/webcrypto/id_rsassaPss.pem", hash: "SHA-256" },
  // id-RSASSA-PSS (default parameters)
  // `openssl genpkey -algorithm rsa-pss -out id_rsassaPss.pem`
  {
    pem: "cli/tests/testdata/webcrypto/id_rsassaPss_default.pem",
    hash: "SHA-1",
  },
  // id-RSASSA-PSS (default hash)
  // `openssl genpkey -algorithm rsa-pss -pkeyopt rsa_pss_keygen_saltlen:30 -out rsaPss_saltLen_30.pem`
  {
    pem: "cli/tests/testdata/webcrypto/id_rsassaPss_saltLen_30.pem",
    hash: "SHA-1",
  },
];

Deno.test({ permissions: { read: true } }, async function importRsaPkcs8() {
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  for (const { pem, hash } of pkcs8TestVectors) {
    const keyFile = await Deno.readTextFile(pem);
    const pemContents = keyFile.substring(
      pemHeader.length,
      keyFile.length - pemFooter.length,
    );
    const binaryDerString = atob(pemContents);
    const binaryDer = new Uint8Array(binaryDerString.length);
    for (let i = 0; i < binaryDerString.length; i++) {
      binaryDer[i] = binaryDerString.charCodeAt(i);
    }

    const key = await crypto.subtle.importKey(
      "pkcs8",
      binaryDer,
      { name: "RSA-PSS", hash },
      true,
      ["sign"],
    );

    assert(key);
    assertEquals(key.type, "private");
    assertEquals(key.extractable, true);
    assertEquals(key.usages, ["sign"]);
    const algorithm = key.algorithm as RsaHashedKeyAlgorithm;
    assertEquals(algorithm.name, "RSA-PSS");
    assertEquals(algorithm.hash.name, hash);
    assertEquals(algorithm.modulusLength, 2048);
    assertEquals(algorithm.publicExponent, new Uint8Array([1, 0, 1]));
  }
});

// deno-fmt-ignore
const asn1AlgorithmIdentifier = new Uint8Array([
  0x02, 0x01, 0x00, // INTEGER
  0x30, 0x0d, // SEQUENCE (2 elements)
  0x06, 0x09, // OBJECT IDENTIFIER
  0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, // 1.2.840.113549.1.1.1 (rsaEncryption)
  0x05, 0x00, // NULL
]);

Deno.test(async function rsaExport() {
  for (const algorithm of ["RSASSA-PKCS1-v1_5", "RSA-PSS", "RSA-OAEP"]) {
    const keyPair = await crypto.subtle.generateKey(
      {
        name: algorithm,
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      algorithm !== "RSA-OAEP" ? ["sign", "verify"] : ["encrypt", "decrypt"],
    );

    assert(keyPair.privateKey);
    assert(keyPair.publicKey);
    assertEquals(keyPair.privateKey.extractable, true);

    const exportedPrivateKey = await crypto.subtle.exportKey(
      "pkcs8",
      keyPair.privateKey,
    );

    assert(exportedPrivateKey);
    assert(exportedPrivateKey instanceof ArrayBuffer);

    const pkcs8 = new Uint8Array(exportedPrivateKey);
    assert(pkcs8.length > 0);

    assertEquals(
      pkcs8.slice(4, asn1AlgorithmIdentifier.byteLength + 4),
      asn1AlgorithmIdentifier,
    );

    const exportedPublicKey = await crypto.subtle.exportKey(
      "spki",
      keyPair.publicKey,
    );

    const spki = new Uint8Array(exportedPublicKey);
    assert(spki.length > 0);

    assertEquals(
      spki.slice(4, asn1AlgorithmIdentifier.byteLength + 1),
      asn1AlgorithmIdentifier.slice(3),
    );
  }
});

Deno.test(async function testHkdfDeriveBits() {
  const rawKey = await crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "HKDF", hash: "SHA-256" },
    false,
    ["deriveBits"],
  );
  const salt = await crypto.getRandomValues(new Uint8Array(16));
  const info = await crypto.getRandomValues(new Uint8Array(16));
  const result = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: salt,
      info: info,
    },
    key,
    128,
  );
  assertEquals(result.byteLength, 128 / 8);
});

Deno.test(async function testHkdfDeriveBitsWithLargeKeySize() {
  const key = await crypto.subtle.importKey(
    "raw",
    new Uint8Array([0x00]),
    "HKDF",
    false,
    ["deriveBits"],
  );
  await assertRejects(
    () =>
      crypto.subtle.deriveBits(
        {
          name: "HKDF",
          hash: "SHA-1",
          salt: new Uint8Array(),
          info: new Uint8Array(),
        },
        key,
        ((20 * 255) << 3) + 8,
      ),
    DOMException,
    "The length provided for HKDF is too large",
  );
});

Deno.test(async function testDeriveKey() {
  // Test deriveKey
  const rawKey = await crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    "raw",
    rawKey,
    "PBKDF2",
    false,
    ["deriveKey", "deriveBits"],
  );

  const salt = await crypto.getRandomValues(new Uint8Array(16));
  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 1000,
      hash: "SHA-256",
    },
    key,
    { name: "HMAC", hash: "SHA-256" },
    true,
    ["sign"],
  );

  assert(derivedKey instanceof CryptoKey);
  assertEquals(derivedKey.type, "secret");
  assertEquals(derivedKey.extractable, true);
  assertEquals(derivedKey.usages, ["sign"]);

  const algorithm = derivedKey.algorithm as HmacKeyAlgorithm;
  assertEquals(algorithm.name, "HMAC");
  assertEquals(algorithm.hash.name, "SHA-256");
  assertEquals(algorithm.length, 256);
});

Deno.test(async function testAesCbcEncryptDecrypt() {
  const key = await crypto.subtle.generateKey(
    { name: "AES-CBC", length: 128 },
    true,
    ["encrypt", "decrypt"],
  );

  const iv = await crypto.getRandomValues(new Uint8Array(16));
  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-CBC",
      iv,
    },
    key as CryptoKey,
    new Uint8Array([1, 2, 3, 4, 5, 6]),
  );

  assert(encrypted instanceof ArrayBuffer);
  assertEquals(encrypted.byteLength, 16);

  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-CBC",
      iv,
    },
    key as CryptoKey,
    encrypted,
  );

  assert(decrypted instanceof ArrayBuffer);
  assertEquals(decrypted.byteLength, 6);
  assertEquals(new Uint8Array(decrypted), new Uint8Array([1, 2, 3, 4, 5, 6]));
});

// TODO(@littledivy): Enable WPT when we have importKey support
Deno.test(async function testECDH() {
  const namedCurve = "P-256";
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "ECDH",
      namedCurve,
    },
    true,
    ["deriveBits"],
  );

  const derivedKey = await crypto.subtle.deriveBits(
    {
      name: "ECDH",
      public: keyPair.publicKey,
    },
    keyPair.privateKey,
    256,
  );

  assert(derivedKey instanceof ArrayBuffer);
  assertEquals(derivedKey.byteLength, 256 / 8);
});

Deno.test(async function testWrapKey() {
  // Test wrapKey
  const key = await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 4096,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["wrapKey", "unwrapKey"],
  );

  const hmacKey = await crypto.subtle.generateKey(
    {
      name: "HMAC",
      hash: "SHA-256",
      length: 128,
    },
    true,
    ["sign"],
  );

  const wrappedKey = await crypto.subtle.wrapKey(
    "raw",
    hmacKey,
    key.publicKey,
    {
      name: "RSA-OAEP",
      label: new Uint8Array(8),
    },
  );

  assert(wrappedKey instanceof ArrayBuffer);
  assertEquals(wrappedKey.byteLength, 512);
});

// Doesn't need to cover all cases.
// Only for testing types.
Deno.test(async function testAesKeyGen() {
  const key = await crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"],
  );

  assert(key);
  assertEquals(key.type, "secret");
  assertEquals(key.extractable, true);
  assertEquals(key.usages, ["encrypt", "decrypt"]);
  const algorithm = key.algorithm as AesKeyAlgorithm;
  assertEquals(algorithm.name, "AES-GCM");
  assertEquals(algorithm.length, 256);
});

Deno.test(async function testUnwrapKey() {
  const subtle = crypto.subtle;

  const AES_KEY: AesKeyAlgorithm & AesCbcParams = {
    name: "AES-CBC",
    length: 128,
    iv: new Uint8Array(16),
  };

  const RSA_KEY: RsaHashedKeyGenParams & RsaOaepParams = {
    name: "RSA-OAEP",
    modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: "SHA-1",
  };

  const aesKey = await subtle.generateKey(AES_KEY, true, [
    "encrypt",
    "decrypt",
  ]);

  const rsaKeyPair = await subtle.generateKey(
    {
      name: "RSA-OAEP",
      hash: "SHA-1",
      publicExponent: new Uint8Array([1, 0, 1]),
      modulusLength: 2048,
    },
    false,
    ["wrapKey", "encrypt", "unwrapKey", "decrypt"],
  );

  const enc = await subtle.wrapKey(
    "raw",
    aesKey,
    rsaKeyPair.publicKey,
    RSA_KEY,
  );
  const unwrappedKey = await subtle.unwrapKey(
    "raw",
    enc,
    rsaKeyPair.privateKey,
    RSA_KEY,
    AES_KEY,
    false,
    ["encrypt", "decrypt"],
  );

  assert(unwrappedKey instanceof CryptoKey);
  assertEquals(unwrappedKey.type, "secret");
  assertEquals(unwrappedKey.extractable, false);
  assertEquals(unwrappedKey.usages, ["encrypt", "decrypt"]);
});

Deno.test(async function testDecryptWithInvalidIntializationVector() {
  // deno-fmt-ignore
  const data = new Uint8Array([42,42,42,42,42,42,42,42,42,42,42,42,42,42,42]);
  const key = await crypto.subtle.importKey(
    "raw",
    new Uint8Array(16),
    { name: "AES-CBC", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
  // deno-fmt-ignore
  const initVector = new Uint8Array([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-CBC", iv: initVector },
    key,
    data,
  );
  // deno-fmt-ignore
  const initVector2 = new Uint8Array([15,14,13,12,11,10,9,8,7,6,5,4,3,2,1,0]);
  await assertRejects(async () => {
    await crypto.subtle.decrypt(
      { name: "AES-CBC", iv: initVector2 },
      key,
      encrypted,
    );
  }, DOMException);
});

const jwtRSAKeys = {
  "1024": {
    size: 1024,
    publicJWK: {
      kty: "RSA",
      n: "zZn4sRGfjQos56yL_Qy1R9NI-THMnFynn94g5RxA6wGrJh4BJT3x6I9x0IbpS3q-d4ORA6R2vuDMh8dDFRr9RDH6XY-gUScc9U5Jz3UA2KmVfsCbnUPvcAmMV_ENA7_TF0ivVjuIFodyDTx7EKHNVTrHHSlrbt7spbmcivs23Zc",
      e: "AQAB",
    },
    privateJWK: {
      kty: "RSA",
      n: "zZn4sRGfjQos56yL_Qy1R9NI-THMnFynn94g5RxA6wGrJh4BJT3x6I9x0IbpS3q-d4ORA6R2vuDMh8dDFRr9RDH6XY-gUScc9U5Jz3UA2KmVfsCbnUPvcAmMV_ENA7_TF0ivVjuIFodyDTx7EKHNVTrHHSlrbt7spbmcivs23Zc",
      e: "AQAB",
      d: "YqIK_GdH85F-GWZdgfgmv15NE78gOaL5h2g4v7DeM9-JC7A5PHSLKNYn87HFGcC4vv0PBIBRtyCA_mJJfEaGWORVCOXSBpWNepMYpio52n3w5uj5UZEsBnbtZc0EtWhVF2Auqa7VbiKrWcQUEgEI8V0gE5D4tyBg8GXv9975dQE",
      p: "9BrAg5L1zfqGPuWJDuDCBX-TmtZdrOI3Ys4ZaN-yMPlTjwWSEPO0qnfjEZcw2VgXHgJJmbVco6TxckJCmEYqeQ",
      q: "157jDJ1Ya5nmQvTPbhKAPAeMWogxCyaQTkBrp30pEKd6mGSB385hqr4BIk8s3f7MdXpM-USpaZgUoT4o_2VEjw",
      dp:
        "qdd_QUzcaB-6jkKo1Ug-1xKIAgDLFsIjJUUfWt_iHL8ti2Kl2dOnTcCypgebPm5TT1bqHN-agGYAdK5zpX2UiQ",
      dq:
        "hNRfwOSplNfhLvxLUN7a2qA3yYm-1MSz_1DWQP7srlLORlUcYPht2FZmsnEeDcAqynBGPQUcbG2Av_hgHz2OZw",
      qi:
        "zbpJQAhinrxSbVKxBQ2EZGFUD2e3WCXbAJRYpk8HVQ5AA52OhKTicOye2hEHnrgpFKzC8iznTsCG3FMkvwcj4Q",
    },
  },

  "2048": {
    size: 2048,
    publicJWK: {
      kty: "RSA",
      // unpadded base64 for rawKey.
      n: "09eVwAhT9SPBxdEN-74BBeEANGaVGwqH-YglIc4VV7jfhR2by5ivzVq8NCeQ1_ACDIlTDY8CTMQ5E1c1SEXmo_T7q84XUGXf8U9mx6uRg46sV7fF-hkwJR80BFVsvWxp4ahPlVJYj__94ft7rIVvchb5tyalOjrYFCJoFnSgq-i3ZjU06csI9XnO5klINucD_Qq0vUhO23_Add2HSYoRjab8YiJJR_Eths7Pq6HHd2RSXmwYp5foRnwe0_U75XmesHWDJlJUHYbwCZo0kP9G8g4QbucwU-MSNBkZOO2x2ZtZNexpHd0ThkATbnNlpVG_z2AGNORp_Ve3rlXwrGIXXw",
      e: "AQAB",
    },
    privateJWK: {
      kty: "RSA",
      // unpadded base64 for rawKey.
      n: "09eVwAhT9SPBxdEN-74BBeEANGaVGwqH-YglIc4VV7jfhR2by5ivzVq8NCeQ1_ACDIlTDY8CTMQ5E1c1SEXmo_T7q84XUGXf8U9mx6uRg46sV7fF-hkwJR80BFVsvWxp4ahPlVJYj__94ft7rIVvchb5tyalOjrYFCJoFnSgq-i3ZjU06csI9XnO5klINucD_Qq0vUhO23_Add2HSYoRjab8YiJJR_Eths7Pq6HHd2RSXmwYp5foRnwe0_U75XmesHWDJlJUHYbwCZo0kP9G8g4QbucwU-MSNBkZOO2x2ZtZNexpHd0ThkATbnNlpVG_z2AGNORp_Ve3rlXwrGIXXw",
      e: "AQAB",
      d: "H4xboN2co0VP9kXL71G8lUOM5EDis8Q9u8uqu_4U75t4rjpamVeD1vFMVfgOehokM_m_hKVnkkcmuNqj9L90ObaiRFPM5QxG7YkFpXbHlPAKeoXD1hsqMF0VQg_2wb8DhberInHA_rEA_kaVhHvavQLu7Xez45gf1d_J4I4931vjlCB6cupbLL0H5hHsxbMsX_5nnmAJdL_U3gD-U7ZdQheUPhDBJR2KeGzvnTm3KVKpOnwn-1Cd45MU4-KDdP0FcBVEuBsSrsQHliTaciBgkbyj__BangPj3edDxTkb-fKkEvhkXRjAoJs1ixt8nfSGDce9cM_GqAX9XGb4s2QkAQ",
      dp:
        "mM82RBwzGzi9LAqjGbi-badLtHRRBoH9sfMrJuOtzxRnmwBFccg_lwy-qAhUTqnN9kvD0H1FzXWzoFPFJbyi-AOmumYGpWm_PvzQGldne5CPJ02pYaeg-t1BePsT3OpIq0Am8E2Kjf9polpRJwIjO7Kx8UJKkhg5bISnsy0V8wE",
      dq:
        "ZlM4AvrWIpXwqsH_5Q-6BsLJdbnN_GypFCXoT9VXniXncSBZIWCkgDndBdWkSzyzIN65NiMRBfZaf9yduTFj4kvOPwb3ch3J0OxGJk0Ary4OGSlS1zNwMl93ALGal1FzpWUuiia9L9RraGqXAUr13L7TIIMRobRjpAV-z7M-ruM",
      p: "7VwGt_tJcAFQHrmDw5dM1EBru6fidM45NDv6VVOEbxKuD5Sh2EfAHfm5c6oouA1gZqwvKH0sn_XpB1NsyYyHEQd3sBVdK0zRjTo-E9mRP-1s-LMd5YDXVq6HE339nxpXsmO25slQEF6zBrj1bSNNXBFc7fgDnlq-HIeleMvsY_E",
      q: "5HqMHLzb4IgXhUl4pLz7E4kjY8PH2YGzaQfK805zJMbOXzmlZK0hizKo34Qqd2nB9xos7QgzOYQrNfSWheARwVsSQzAE0vGvw3zHIPP_lTtChBlCTPctQcURjw4dXcnK1oQ-IT321FNOW3EO-YTsyGcypJqJujlZrLbxYjOjQE8",
      qi:
        "OQXzi9gypDnpdHatIi0FaUGP8LSzfVH0AUugURJXs4BTJpvA9y4hcpBQLrcl7H_vq6kbGmvC49V-9I5HNVX_AuxGIXKuLZr5WOxPq8gLTqHV7X5ZJDtWIP_nq2NNgCQQyNNRrxebiWlwGK9GnX_unewT6jopI_oFhwp0Q13rBR0",
    },
  },
  "4096": {
    size: 4096,
    publicJWK: {
      kty: "RSA",
      n: "2qr2TL2c2JmbsN0OLIRnaAB_ZKb1-Gh9H0qb4lrBuDaqkW_eFPwT-JIsvnNJvDT7BLJ57tTMIj56ZMtv6efSSTWSk9MOoW2J1K_iEretZ2cegB_aRX7qQVjnoFsz9U02BKfAIUT0o_K7b9G08d1rrAUohi_SVQhwObodg7BddMbKUmz70QNIS487LN44WUVnn9OgE9atTYUARNukT0DuQb3J-K20ksTuVujXbSelohDmLobqlGoi5sY_548Qs9BtFmQ2nGuEHNB2zdlZ5EvEqbUFVZ2QboG6jXdoos6qcwdgUvAhj1Hz10Ngic_RFqL7bNDoIOzNp66hdA35uxbwuaygZ16ikxoPj7eTYud1hrkyQCgeGw2YhCiKIE6eos_U5dL7WHRD5aSkkzsgXtnF8pVmStsuf0QcdAoC-eeCex0tSTgRw9AtGTz8Yr1tGQD9l_580zAXnE6jmrwRRQ68EEA7vohGov3tnG8pGyg_zcxeADLtPlfTc1tEwmh3SGrioDClioYCipm1JvkweEgP9eMPpEC8SgRU1VNDSVe1SF4uNsH8vA7PHFKfg6juqJEc5ht-l10FYER-Qq6bZXsU2oNcfE5SLDeLTWmxiHmxK00M8ABMFIV5gUkPoMiWcl87O6XwzA2chsIERp7Vb-Vn2O-EELiXzv7lPhc6fTGQ0Nc",
      e: "AQAB",
    },
    privateJWK: {
      kty: "RSA",
      n: "2qr2TL2c2JmbsN0OLIRnaAB_ZKb1-Gh9H0qb4lrBuDaqkW_eFPwT-JIsvnNJvDT7BLJ57tTMIj56ZMtv6efSSTWSk9MOoW2J1K_iEretZ2cegB_aRX7qQVjnoFsz9U02BKfAIUT0o_K7b9G08d1rrAUohi_SVQhwObodg7BddMbKUmz70QNIS487LN44WUVnn9OgE9atTYUARNukT0DuQb3J-K20ksTuVujXbSelohDmLobqlGoi5sY_548Qs9BtFmQ2nGuEHNB2zdlZ5EvEqbUFVZ2QboG6jXdoos6qcwdgUvAhj1Hz10Ngic_RFqL7bNDoIOzNp66hdA35uxbwuaygZ16ikxoPj7eTYud1hrkyQCgeGw2YhCiKIE6eos_U5dL7WHRD5aSkkzsgXtnF8pVmStsuf0QcdAoC-eeCex0tSTgRw9AtGTz8Yr1tGQD9l_580zAXnE6jmrwRRQ68EEA7vohGov3tnG8pGyg_zcxeADLtPlfTc1tEwmh3SGrioDClioYCipm1JvkweEgP9eMPpEC8SgRU1VNDSVe1SF4uNsH8vA7PHFKfg6juqJEc5ht-l10FYER-Qq6bZXsU2oNcfE5SLDeLTWmxiHmxK00M8ABMFIV5gUkPoMiWcl87O6XwzA2chsIERp7Vb-Vn2O-EELiXzv7lPhc6fTGQ0Nc",
      e: "AQAB",
      d: "uXPRXBhcE5-DWabBRKQuhxgU8ype5gTISWefeYP7U96ZHqu_sBByZ5ihdgyU9pgAZGVx4Ep9rnVKnH2lNr2zrP9Qhyqy99nM0aMxmypIWLAuP__DwLj4t99M4sU29c48CAq1egHfccSFjzpNuetOTCA71EJuokt70pm0OmGzgTyvjuR7VTLxd5PMXitBowSn8_cphmnFpT8tkTiuy8CH0R3DU7MOuINomDD1s8-yPBcVAVTPUnwJiauNuzestLQKMLlhT5wn-cAbYk36XRKdgkjSc2AkhHRl4WDqT1nzWYdh_DVIYSLiKSktkPO9ovMrRYiPtozfhl0m9SR9Ll0wXtcnnDlWXc_MSGpw18vmUBSJ4PIhkiFsvLn-db3wUkA8uve-iqqfk0sxlGWughWx03kGmZDmprWbXugCBHfsI4X93w4exznXH_tapxPnmjbhVUQR6p41MvO2lcHWPLwGJgLIoejBHpnn3TmMN0UjFZki7q9B_dJ3fXh0mX9DzAlC0sil1NgCPhMPq02393_giinQquMknrBvgKxGSfGUrDKuflCx611ZZlRM3R7YMX2OIy1g4DyhPzBVjxRMtm8PnIs3m3Hi-O-C_PHF93w9J8Wqd0yIw7SpavDqZXLPC6Cqi8K7MBZyVECXHtRj1bBqT-h_xZmFCDjSU0NqfOdgApE",
      p: "9NrXwq4kY9kBBOwLoFZVQc4kJI_NbKa_W9FLdQdRIbMsZZHXJ3XDUR9vJAcaaR75WwIC7X6N55nVtWTq28Bys9flJ9RrCTfciOntHEphBhYaL5ZTUl-6khYmsOf_psff2VaOOCvHGff5ejuOmBQxkw2E-cv7knRgWFHoLWpku2NJIMuGHt9ks7OAUfIZVYl9YJnw4FYUzhgaxemknjLeZ8XTkGW2zckzF-d95YI9i8zD80Umubsw-YxriSfqFQ0rGHBsbQ8ZOTd_KJju42BWnXIjNDYmjFUqdzVjI4XQ8EGrCEf_8_iwphGyXD7LOJ4fqd97B3bYpoRTPnCgY_SEHQ",
      q: "5J758_NeKr1XPZiLxXohYQQnh0Lb4QtGZ1xzCgjhBQLcIBeTOG_tYjCues9tmLt93LpJfypSJ-SjDLwkR2s069_IByYGpxyeGtV-ulqYhSw1nD2CXKMDGyO5jXDs9tJrS_UhfobXKQH03CRdFugyPkSNmXY-AafFynG7xLr7oYBC05FnhUXPm3VBTPt9K-BpqwYd_h9vkAWeprSPo83UlwcLMupSJY9LaHxhRdz2yi0ZKNwXXHRwcszGjDBvvzUcCYbqWqjzbEvFY6KtH8Jh4LhM46rHaoEOTernJsDF6a6W8Df88RthqTExcwnaQf0O_dlbjSxEIPfbxx8t1EQugw",
      dp:
        "4Y7Hu5tYAnLhMXuQqj9dgqU3PkcKYdCp7xc6f7Ah2P2JJHfYz4z4RD7Ez1eLyNKzulZ8A_PVHUjlSZiRkaYTBAEaJDrV70P6cFWuC6WpA0ZREQ1V7EgrQnANbGILa8QsPbYyhSQu4YlB1IwQq5_OmzyVBtgWA7AZIMMzMsMT0FuB_if-gWohBjmRN-vh0p45VUf6UW568-_YmgDFmMYbg1UFs7s_TwrNenPR0h7MO4CB8hP9vJLoZrooRczzIjljPbwy5bRG9CJfjTJ0vhj9MUT3kR1hHV1HJVGU5iBbfTfBKnvJGSI6-IDM4ZUm-B0R5hbs6s9cfOjhFmACIJIbMQ",
      dq:
        "gT4iPbfyHyVEwWyQb4X4grjvg7bXSKSwG1SXMDAOzV9tg7LwJjKYNy8gJAtJgNNVdsfVLs-E_Epzpoph1AIWO9YZZXkov6Yc9zyEVONMX9S7ReU74hTBd8E9b2lMfMg9ogYk9jtSPTt-6kigW4fOh4cHqZ6_tP3cgfLD3JZ8FDPHE4WaySvLDq49yUBO5dQKyIU_xV6OGhQjOUjP_yEoMmzn9tOittsIHTxbXTxqQ6c1FvU9O6YTv8Jl5_Cl66khfX1I1RG38xvurcHULyUbYgeuZ_Iuo9XreT73h9_owo9RguGT29XH4vcNZmRGf5GIvRb4e5lvtleIZkwJA3u78w",
      qi:
        "JHmVKb1zwW5iRR6RCeexYnh2fmY-3DrPSdM8Dxhr0F8dayi-tlRqEdnG0hvp45n8gLUskWWcB9EXlUJObZGKDfGuxgMa3g_xeLA2vmFQ12MxPsyH4iCNZvsgmGxx7TuOHrnDh5EBVnM4_de63crEJON2sYI8Ozi-xp2OEmAr2seWKq4sxkFni6exLhqb-NE4m9HMKlng1EtQh2rLBFG1VYD3SYYpMLc5fxzqGvSxn3Fa-Xgg-IZPY3ubrcm52KYgmLUGmnYStfVqGSWSdhDXHlNgI5pdAA0FzpyBk3ZX-JsxhwcnneKrYBBweq06kRMGWgvdbdAQ-7wSeGqqj5VPwA",
    },
  },
};

Deno.test(async function testImportRsaJwk() {
  const subtle = window.crypto.subtle;
  assert(subtle);

  for (const [_key, jwkData] of Object.entries(jwtRSAKeys)) {
    const { size, publicJWK, privateJWK } = jwkData;
    if (size < 2048) {
      continue;
    }

    // 1. Test import PSS
    for (const hash of ["SHA-1", "SHA-256", "SHA-384", "SHA-512"]) {
      const hashMapPSS: Record<string, string> = {
        "SHA-1": "PS1",
        "SHA-256": "PS256",
        "SHA-384": "PS384",
        "SHA-512": "PS512",
      };

      if (size == 1024 && hash == "SHA-512") {
        continue;
      }

      const privateKeyPSS = await crypto.subtle.importKey(
        "jwk",
        {
          alg: hashMapPSS[hash],
          ...privateJWK,
          ext: true,
          "key_ops": ["sign"],
        },
        { name: "RSA-PSS", hash },
        true,
        ["sign"],
      );

      const publicKeyPSS = await crypto.subtle.importKey(
        "jwk",
        {
          alg: hashMapPSS[hash],
          ...publicJWK,
          ext: true,
          "key_ops": ["verify"],
        },
        { name: "RSA-PSS", hash },
        true,
        ["verify"],
      );

      const signaturePSS = await crypto.subtle.sign(
        { name: "RSA-PSS", saltLength: 32 },
        privateKeyPSS,
        new Uint8Array([1, 2, 3, 4]),
      );

      const verifyPSS = await crypto.subtle.verify(
        { name: "RSA-PSS", saltLength: 32 },
        publicKeyPSS,
        signaturePSS,
        new Uint8Array([1, 2, 3, 4]),
      );
      assert(verifyPSS);
    }

    // 2. Test import PKCS1
    for (const hash of ["SHA-1", "SHA-256", "SHA-384", "SHA-512"]) {
      const hashMapPKCS1: Record<string, string> = {
        "SHA-1": "RS1",
        "SHA-256": "RS256",
        "SHA-384": "RS384",
        "SHA-512": "RS512",
      };

      if (size == 1024 && hash == "SHA-512") {
        continue;
      }

      const privateKeyPKCS1 = await crypto.subtle.importKey(
        "jwk",
        {
          alg: hashMapPKCS1[hash],
          ...privateJWK,
          ext: true,
          "key_ops": ["sign"],
        },
        { name: "RSASSA-PKCS1-v1_5", hash },
        true,
        ["sign"],
      );

      const publicKeyPKCS1 = await crypto.subtle.importKey(
        "jwk",
        {
          alg: hashMapPKCS1[hash],
          ...publicJWK,
          ext: true,
          "key_ops": ["verify"],
        },
        { name: "RSASSA-PKCS1-v1_5", hash },
        true,
        ["verify"],
      );

      const signaturePKCS1 = await crypto.subtle.sign(
        { name: "RSASSA-PKCS1-v1_5", saltLength: 32 },
        privateKeyPKCS1,
        new Uint8Array([1, 2, 3, 4]),
      );

      const verifyPKCS1 = await crypto.subtle.verify(
        { name: "RSASSA-PKCS1-v1_5", saltLength: 32 },
        publicKeyPKCS1,
        signaturePKCS1,
        new Uint8Array([1, 2, 3, 4]),
      );
      assert(verifyPKCS1);
    }

    // 3. Test import OAEP
    for (
      const { hash, plainText } of hashPlainTextVector
    ) {
      const hashMapOAEP: Record<string, string> = {
        "SHA-1": "RSA-OAEP",
        "SHA-256": "RSA-OAEP-256",
        "SHA-384": "RSA-OAEP-384",
        "SHA-512": "RSA-OAEP-512",
      };

      if (size == 1024 && hash == "SHA-512") {
        continue;
      }

      const encryptAlgorithm = { name: "RSA-OAEP" };

      const privateKeyOAEP = await crypto.subtle.importKey(
        "jwk",
        {
          alg: hashMapOAEP[hash],
          ...privateJWK,
          ext: true,
          "key_ops": ["decrypt"],
        },
        { ...encryptAlgorithm, hash },
        true,
        ["decrypt"],
      );

      const publicKeyOAEP = await crypto.subtle.importKey(
        "jwk",
        {
          alg: hashMapOAEP[hash],
          ...publicJWK,
          ext: true,
          "key_ops": ["encrypt"],
        },
        { ...encryptAlgorithm, hash },
        true,
        ["encrypt"],
      );
      const cipherText = await subtle.encrypt(
        encryptAlgorithm,
        publicKeyOAEP,
        plainText,
      );

      assert(cipherText);
      assert(cipherText.byteLength > 0);
      assertEquals(cipherText.byteLength * 8, size);
      assert(cipherText instanceof ArrayBuffer);

      const decrypted = await subtle.decrypt(
        encryptAlgorithm,
        privateKeyOAEP,
        cipherText,
      );
      assert(decrypted);
      assert(decrypted instanceof ArrayBuffer);
      assertEquals(new Uint8Array(decrypted), plainText);
    }
  }
});
