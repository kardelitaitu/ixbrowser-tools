# Advanced ixBrowser Profile Management System v2.0
# Enterprise-grade PowerShell orchestration with resource monitoring

param(
    [Parameter(Mandatory=$false)]
    [int]$MaxConcurrent = 4,
    
    [Parameter(Mandatory=$false)]
    [int]$ResourceCheckInterval = 5,
    
    [Parameter(Mandatory=$false)]
    [string]$ConfigPath = ".\config\profiles.json",
    
    [Parameter(Mandatory=$false)]
    [switch]$EnableResourceMonitoring = $true,
    
    [Parameter(Mandatory=$false)]
    [switch]$GenerateReport = $true
)

# Enhanced logging with resource metrics
function Write-EnhancedLog {
    param(
        [string]$Message,
        [ValidateSet("INFO", "WARN", "ERROR", "SUCCESS")]
        [string]$Level = "INFO",
        [hashtable]$Metadata = @{}
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss.fff"
    $resourceInfo = Get-ResourceSnapshot
    
    $logEntry = @{
        Timestamp = $timestamp
        Level = $Level
        Message = $Message
        Memory_Percent = $resourceInfo.MemoryPercent
        CPU_Percent = $resourceInfo.CPUPercent
        Available_RAM_GB = $resourceInfo.AvailableRAM
    }
    
    $logEntry += $Metadata
    
    # Color-coded console output
    $color = switch($Level) {
        "SUCCESS" { "Green" }
        "WARN" { "Yellow" }  
        "ERROR" { "Red" }
        default { "White" }
    }
    
    $displayMessage = "[$timestamp] [$Level] $Message | RAM: $($resourceInfo.MemoryPercent)% CPU: $($resourceInfo.CPUPercent)%"
    Write-Host $displayMessage -ForegroundColor $color
    
    # Append to log file
    $logEntry | ConvertTo-Json -Compress | Out-File -FilePath ".\logs\enhanced_profile_management.log" -Append -Encoding UTF8
}

# Real-time resource monitoring
function Get-ResourceSnapshot {
    $os = Get-CimInstance -ClassName Win32_OperatingSystem
    $processor = Get-CimInstance -ClassName Win32_Processor
    
    $totalRAM = [math]::Round($os.TotalVisibleMemorySize / 1MB, 2)
    $availableRAM = [math]::Round($os.FreePhysicalMemory / 1MB, 2)
    $usedRAM = $totalRAM - $availableRAM
    $memoryPercent = [math]::Round(($usedRAM / $totalRAM) * 100, 1)
    
    # CPU usage calculation
    $cpuPercent = (Get-Counter "\Processor(_Total)\% Processor Time").CounterSamples[0].CookedValue
    $cpuPercent = [math]::Round($cpuPercent, 1)
    
    return @{
        TotalRAM = $totalRAM
        AvailableRAM = $availableRAM
        UsedRAM = $usedRAM
        MemoryPercent = $memoryPercent
        CPUPercent = $cpuPercent
        Timestamp = Get-Date
    }
}

# Intelligent profile batching algorithm
function New-OptimalBatches {
    param(
        [array]$Profiles,
        [int]$BatchSize
    )
    
    Write-EnhancedLog "Calculating optimal batches for $($Profiles.Count) profiles" -Level "INFO"
    
    # Sort profiles by complexity (proxy count, extensions, etc.)
    $sortedProfiles = $Profiles | Sort-Object { 
        $complexity = 0
        if ($_.proxy) { $complexity += 2 }
        if ($_.extensions) { $complexity += $_.extensions.Count }
        if ($_.user_agent -like "*mobile*") { $complexity += 1 }
        return $complexity
    }
    
    $batches = @()
    for ($i = 0; $i -lt $sortedProfiles.Count; $i += $BatchSize) {
        $batch = $sortedProfiles[$i..([math]::Min($i + $BatchSize - 1, $sortedProfiles.Count - 1))]
        $batches += ,$batch
    }
    
    Write-EnhancedLog "Created $($batches.Count) optimal batches" -Level "SUCCESS"
    return $batches
}

# Advanced ixBrowser profile management
function Start-EnhancedAutomation {
    param(
        [array]$ProfileBatch,
        [string]$AutomationScript = "_launchAutomation.js",
        [int]$TimeoutMinutes = 5
    )
    
    $jobs = @()
    $startTime = Get-Date
    
    foreach ($profile in $ProfileBatch) {
        $profileName = $profile.name ?? "Profile-$($profile.id)"
        
        Write-EnhancedLog "Starting automation for profile: $profileName" -Level "INFO" -Metadata @{ProfileId = $profile.id}
        
        # Create background job with resource monitoring
        $job = Start-Job -Name "Profile_$($profile.id)" -ScriptBlock {
            param($ProfileId, $AutomationScript, $TimeoutMinutes)
            
            $process = Start-Process -FilePath "node" -ArgumentList $AutomationScript, "--profile-id", $ProfileId -PassThru -WindowStyle Hidden
            
            $timeout = (Get-Date).AddMinutes($TimeoutMinutes)
            while (!$process.HasExited -and (Get-Date) -lt $timeout) {
                Start-Sleep -Seconds 2
            }
            
            if (!$process.HasExited) {
                $process.Kill()
                return @{
                    Success = $false
                    Error = "Timeout after $TimeoutMinutes minutes"
                    ProfileId = $ProfileId
                }
            }
            
            return @{
                Success = $process.ExitCode -eq 0
                ExitCode = $process.ExitCode
                ProfileId = $ProfileId
                Duration = (Get-Date) - $process.StartTime
            }
        } -ArgumentList $profile.id, $AutomationScript, $TimeoutMinutes
        
        $jobs += @{
            Job = $job
            ProfileName = $profileName
            ProfileId = $profile.id
            StartTime = Get-Date
        }
        
        # Prevent system overload
        Start-Sleep -Seconds 2
    }
    
    # Monitor jobs with resource awareness
    $results = @()
    $monitoringActive = $true
    
    # Background resource monitoring
    $resourceMonitor = Start-Job -ScriptBlock {
        param($CheckInterval)
        while ($true) {
            $resources = Get-CimInstance -ClassName Win32_OperatingSystem
            $memoryPercent = [math]::Round((($resources.TotalVisibleMemorySize - $resources.FreePhysicalMemory) / $resources.TotalVisibleMemorySize) * 100, 1)
            
             if ($memoryPercent -gt 85) {
                 Write-Warning "HIGH MEMORY USAGE: $memoryPercent%"
                 # Suggest profile limits based on memory
                 $suggestedMax = [math]::Max(1, [math]::Floor($availableRAM / 1.5))
                 Write-Warning "Consider reducing max concurrent profiles to $suggestedMax for stability"
             }
            
            Start-Sleep -Seconds $CheckInterval
        }
    } -ArgumentList $ResourceCheckInterval
    
    try {
        # Wait for all jobs to complete
        while ($jobs | Where-Object { $_.Job.State -eq "Running" }) {
            foreach ($jobInfo in $jobs) {
                if ($jobInfo.Job.State -eq "Completed" -and !$jobInfo.Processed) {
                    $result = Receive-Job -Job $jobInfo.Job
                    $duration = (Get-Date) - $jobInfo.StartTime
                    
                    $results += @{
                        ProfileName = $jobInfo.ProfileName
                        ProfileId = $jobInfo.ProfileId
                        Success = $result.Success
                        Duration = $duration
                        Error = $result.Error
                        ExitCode = $result.ExitCode
                    }
                    
                    $status = if ($result.Success) { "SUCCESS" } else { "ERROR" }
                    Write-EnhancedLog "Profile $($jobInfo.ProfileName) completed" -Level $status -Metadata @{
                        Duration = $duration.TotalSeconds
                        ProfileId = $jobInfo.ProfileId
                    }
                    
                    $jobInfo.Processed = $true
                    Remove-Job -Job $jobInfo.Job
                }
                elseif ($jobInfo.Job.State -eq "Failed") {
                    Write-EnhancedLog "Profile $($jobInfo.ProfileName) job failed" -Level "ERROR" -Metadata @{ProfileId = $jobInfo.ProfileId}
                    $jobInfo.Processed = $true
                    Remove-Job -Job $jobInfo.Job
                }
            }
            
            Start-Sleep -Seconds 2
        }
    }
    finally {
        # Cleanup resource monitor
        Stop-Job -Job $resourceMonitor -ErrorAction SilentlyContinue
        Remove-Job -Job $resourceMonitor -ErrorAction SilentlyContinue
        
        # Cleanup any remaining jobs
        $jobs | ForEach-Object { 
            if ($_.Job.State -ne "Completed") {
                Stop-Job -Job $_.Job -ErrorAction SilentlyContinue
                Remove-Job -Job $_.Job -ErrorAction SilentlyContinue
            }
        }
    }
    
    return $results
}

# Performance analysis and reporting
function New-PerformanceReport {
    param(
        [array]$Results,
        [datetime]$SessionStart
    )
    
    $sessionDuration = (Get-Date) - $SessionStart
    $totalProfiles = $Results.Count
    $successfulProfiles = ($Results | Where-Object { $_.Success }).Count
    $failedProfiles = $totalProfiles - $successfulProfiles
    $successRate = if ($totalProfiles -gt 0) { [math]::Round(($successfulProfiles / $totalProfiles) * 100, 2) } else { 0 }
    
    $avgDuration = if ($successfulProfiles -gt 0) {
        ($Results | Where-Object { $_.Success } | Measure-Object -Property { $_.Duration.TotalSeconds } -Average).Average
    } else { 0 }
    
    $report = @{
        SessionDuration = $sessionDuration
        TotalProfiles = $totalProfiles
        SuccessfulProfiles = $successfulProfiles
        FailedProfiles = $failedProfiles
        SuccessRate = $successRate
        AverageExecutionTime = [math]::Round($avgDuration, 2)
        ResourceSnapshot = Get-ResourceSnapshot()
        Timestamp = Get-Date
        Recommendations = @()
    }
    
    # Generate intelligent recommendations
    if ($successRate -lt 80) {
        $report.Recommendations += "Consider reducing concurrency to improve stability"
    }
    if ($avgDuration -gt 120) {
        $report.Recommendations += "Review automation logic for potential optimization"
    }
    
    # Resource-based recommendations
    $resources = $report.ResourceSnapshot
    if ($resources.MemoryPercent -gt 80) {
        $report.Recommendations += "System memory usage is high - consider memory optimization"
    }
    if ($resources.CPUPercent -gt 80) {
        $report.Recommendations += "High CPU usage detected - consider reducing parallel execution"
    }
    
    return $report
}

# Export performance report
function Export-PerformanceReport {
    param(
        [hashtable]$Report,
        [string]$OutputPath = ".\reports"
    )
    
    if (!(Test-Path $OutputPath)) {
        New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null
    }
    
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $reportFile = Join-Path $OutputPath "performance_report_$timestamp.json"
    
    $Report | ConvertTo-Json -Depth 3 | Out-File -FilePath $reportFile -Encoding UTF8
    
    Write-EnhancedLog "Performance report exported to: $reportFile" -Level "SUCCESS"
    
    # Also create a summary CSV for easy analysis
    $csvData = @(
        [PSCustomObject]@{
            Timestamp = $Report.Timestamp
            SessionDuration_Minutes = [math]::Round($Report.SessionDuration.TotalMinutes, 2)
            TotalProfiles = $Report.TotalProfiles
            SuccessfulProfiles = $Report.SuccessfulProfiles
            FailedProfiles = $Report.FailedProfiles
            SuccessRate_Percent = $Report.SuccessRate
            AvgExecutionTime_Seconds = $Report.AverageExecutionTime
            Memory_Percent = $Report.ResourceSnapshot.MemoryPercent
            CPU_Percent = $Report.ResourceSnapshot.CPUPercent
            Available_RAM_GB = $Report.ResourceSnapshot.AvailableRAM
        }
    )
    
    $csvFile = Join-Path $OutputPath "performance_summary_$timestamp.csv"
    $csvData | Export-Csv -Path $csvFile -NoTypeInformation -Encoding UTF8
    
    Write-EnhancedLog "CSV summary exported to: $csvFile" -Level "SUCCESS"
    return $reportFile
}

# Main execution function
function Invoke-EnhancedProfileManagement {
    $sessionStart = Get-Date
    Write-EnhancedLog "=== Enhanced Profile Management Session Started ===" -Level "INFO"
    
    try {
        # Ensure required directories exist
        @(".\logs", ".\reports", ".\config") | ForEach-Object {
            if (!(Test-Path $_)) {
                New-Item -ItemType Directory -Path $_ -Force | Out-Null
                Write-EnhancedLog "Created directory: $_" -Level "INFO"
            }
        }
        
        # Get system resource baseline
        $baselineResources = Get-ResourceSnapshot
        Write-EnhancedLog "System baseline - RAM: $($baselineResources.MemoryPercent)% CPU: $($baselineResources.CPUPercent)%" -Level "INFO"
        
        # Fetch opened profiles from ixBrowser API
        Write-EnhancedLog "Fetching opened profiles from ixBrowser..." -Level "INFO"
        
        $apiResponse = try {
            Invoke-RestMethod -Uri "http://127.0.0.1:30000/api/v2/browser/opened" -Method Get -Headers @{
                "Authorization" = "Bearer $env:IXBROWSER_API_KEY"
                "Content-Type" = "application/json"
            }
        }
        catch {
            Write-EnhancedLog "Failed to fetch profiles: $($_.Exception.Message)" -Level "ERROR"
            throw
        }
        
        if ($apiResponse.code -ne 200 -or !$apiResponse.data) {
            Write-EnhancedLog "No opened profiles found or API error" -Level "WARN"
            return
        }
        
        $profiles = $apiResponse.data
        Write-EnhancedLog "Found $($profiles.Count) opened profiles" -Level "SUCCESS"
        
        # Calculate optimal batch size based on system resources
        $optimalConcurrency = [math]::Min($MaxConcurrent, [math]::Floor($baselineResources.AvailableRAM / 1.2))
        Write-EnhancedLog "Calculated optimal concurrency: $optimalConcurrency profiles" -Level "INFO"
        
        # Create optimal batches
        $batches = New-OptimalBatches -Profiles $profiles -BatchSize $optimalConcurrency
        
        # Execute automation in batches
        $allResults = @()
        for ($batchIndex = 0; $batchIndex -lt $batches.Count; $batchIndex++) {
            $batch = $batches[$batchIndex]
            Write-EnhancedLog "Executing batch $($batchIndex + 1)/$($batches.Count) with $($batch.Count) profiles" -Level "INFO"
            
            # Check resources before batch execution
            $currentResources = Get-ResourceSnapshot
            if ($currentResources.MemoryPercent -gt 85 -or $currentResources.CPUPercent -gt 85) {
                Write-EnhancedLog "High resource usage detected. Waiting for system to stabilize..." -Level "WARN"
                Start-Sleep -Seconds 30
            }
            
            $batchResults = Start-EnhancedAutomation -ProfileBatch $batch -TimeoutMinutes 5
            $allResults += $batchResults
            
            # Inter-batch cooldown
            if ($batchIndex -lt $batches.Count - 1) {
                Write-EnhancedLog "Inter-batch cooldown (15 seconds)..." -Level "INFO"
                Start-Sleep -Seconds 15
            }
        }
        
        # Generate comprehensive performance report
        if ($GenerateReport) {
            $performanceReport = New-PerformanceReport -Results $allResults -SessionStart $sessionStart
            $reportFile = Export-PerformanceReport -Report $performanceReport
            
            # Display summary
            Write-EnhancedLog "=== EXECUTION SUMMARY ===" -Level "SUCCESS"
            Write-EnhancedLog "Total Profiles: $($performanceReport.TotalProfiles)" -Level "INFO"
            Write-EnhancedLog "Successful: $($performanceReport.SuccessfulProfiles) ($($performanceReport.SuccessRate)%)" -Level "SUCCESS"
            Write-EnhancedLog "Failed: $($performanceReport.FailedProfiles)" -Level $(if ($performanceReport.FailedProfiles -gt 0) { "WARN" } else { "INFO" })
            Write-EnhancedLog "Average Execution Time: $($performanceReport.AverageExecutionTime) seconds" -Level "INFO"
            Write-EnhancedLog "Session Duration: $([math]::Round($performanceReport.SessionDuration.TotalMinutes, 2)) minutes" -Level "INFO"
            
            if ($performanceReport.Recommendations.Count -gt 0) {
                Write-EnhancedLog "=== RECOMMENDATIONS ===" -Level "INFO"
                $performanceReport.Recommendations | ForEach-Object {
                    Write-EnhancedLog "• $_" -Level "WARN"
                }
            }
        }
        
        Write-EnhancedLog "=== Enhanced Profile Management Session Completed ===" -Level "SUCCESS"
        
    }
    catch {
        Write-EnhancedLog "Critical error in main execution: $($_.Exception.Message)" -Level "ERROR"
        Write-EnhancedLog "Stack trace: $($_.Exception.StackTrace)" -Level "ERROR"
        throw
    }
}

# Resource cleanup function
function Clear-SessionResources {
    Write-EnhancedLog "Cleaning up session resources..." -Level "INFO"
    
    # Stop any running Node.js processes related to ixBrowser automation
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
        $_.CommandLine -like "*_launchAutomation*" -or $_.CommandLine -like "*ixbrowser*"
    } | ForEach-Object {
        Write-EnhancedLog "Stopping Node.js process: $($_.Id)" -Level "WARN"
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    }
    
    # Clean up any orphaned Chrome processes
    Get-Process -Name "chrome" -ErrorAction SilentlyContinue | Where-Object {
        $_.CommandLine -like "*remote-debugging-port*"
    } | ForEach-Object {
        Write-EnhancedLog "Stopping Chrome automation process: $($_.Id)" -Level "WARN"
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    }
    
    # Force garbage collection
    [System.GC]::Collect()
    [System.GC]::WaitForPendingFinalizers()
    
    Write-EnhancedLog "Resource cleanup completed" -Level "SUCCESS"
}

# Health check function
function Test-SystemHealth {
    param(
        [int]$MemoryThreshold = 85,
        [int]$CPUThreshold = 80
    )
    
    $resources = Get-ResourceSnapshot
    $healthStatus = @{
        IsHealthy = $true
        Issues = @()
        Resources = $resources
    }
    
    if ($resources.MemoryPercent -gt $MemoryThreshold) {
        $healthStatus.IsHealthy = $false
        $healthStatus.Issues += "High memory usage: $($resources.MemoryPercent)%"
    }
    
    if ($resources.CPUPercent -gt $CPUThreshold) {
        $healthStatus.IsHealthy = $false
        $healthStatus.Issues += "High CPU usage: $($resources.CPUPercent)%"
    }
    
    if ($resources.AvailableRAM -lt 2) {
        $healthStatus.IsHealthy = $false
        $healthStatus.Issues += "Low available RAM: $($resources.AvailableRAM)GB"
    }
    
    return $healthStatus
}

# Export functions for module use
Export-ModuleMember -Function @(
    'Invoke-EnhancedProfileManagement',
    'Get-ResourceSnapshot',
    'Test-SystemHealth',
    'Clear-SessionResources',
    'Write-EnhancedLog'
)

# Main execution if script is run directly
if ($MyInvocation.InvocationName -eq $MyInvocation.MyCommand.Name) {
    try {
        # Pre-execution health check
        $healthCheck = Test-SystemHealth
        if (!$healthCheck.IsHealthy) {
            Write-EnhancedLog "System health issues detected:" -Level "WARN"
            $healthCheck.Issues | ForEach-Object { Write-EnhancedLog "• $_" -Level "WARN" }
            
            $continue = Read-Host "Continue anyway? (y/N)"
            if ($continue -ne 'y' -and $continue -ne 'Y') {
                Write-EnhancedLog "Execution cancelled by user" -Level "INFO"
                exit 1
            }
        }
        
        # Execute main function
        Invoke-EnhancedProfileManagement
    }
    catch {
        Write-EnhancedLog "Execution failed: $($_.Exception.Message)" -Level "ERROR"
        exit 1
    }
    finally {
        Clear-SessionResources
    }
}