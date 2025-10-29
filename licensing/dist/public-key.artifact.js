"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PUBLIC_KEY_JWK = void 0;
/**
 * Public key for license verification in JWK format
 */
exports.PUBLIC_KEY_JWK = {
    "key_ops": [
        "verify"
    ],
    "ext": true,
    "kty": "EC",
    "x": "qZDpWPYjEIabzzfC8PbbJAMXyBrhlKNqCzxONQbM0Kg",
    "y": "TpYJFvAgZ0JAFKxoWI-5BZ7UAPgg3o43XCWF1MxdkJ4",
    "crv": "P-256"
};
