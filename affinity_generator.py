function Get-AffinityMask {
    param (
        [int]$instanceIndex  # 0-based index
    )

    # Safety check: limit to 32 threads max
    if ($instanceIndex -lt 0 -or $instanceIndex -ge 32) {
        throw "Instance index must be between 0 and 31"
    }

    # Generate bitmask by left-shifting 1 by instanceIndex
    return [int]([math]::Pow(2, $instanceIndex))
}

# Example usage
$instanceCount = 8  # Change as needed

for ($i = 0; $i -lt $instanceCount; $i++) {
    $mask = Get-AffinityMask -instanceIndex $i
    Write-Host "Instance $i → Affinity Mask: 0x$("{0:X8}" -f $mask)"
}