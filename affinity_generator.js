function getAffinityMask(instanceIndex) {
    if (instanceIndex < 0 || instanceIndex >= 32) {
        throw new Error("Instance index must be between 0 and 31");
    }

    // Left shift 1 by instance index
    const mask = 1 << instanceIndex;

    return mask;
}

// Example usage
const instanceCount = 8; // Modify as needed

for (let i = 0; i < instanceCount; i++) {
    const mask = getAffinityMask(i);
    console.log(`Instance ${i} → Affinity Mask: 0x${mask.toString(16).padStart(8, '0')}`);
}
