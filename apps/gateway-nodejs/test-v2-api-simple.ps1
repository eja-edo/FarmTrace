# V2 API Gateway Simple Test
$API_URL = "http://localhost:3000"
$TESTS_PASSED = 0; $TESTS_FAILED = 0

Write-Host "======================================" -ForegroundColor Cyan
Write-Host " V2 API GATEWAY TEST" -ForegroundColor Cyan
Write-Host "======================================`n" -ForegroundColor Cyan

$PRODUCT_ID = "PROD-API-$(Get-Date -Format 'HHmmss')"
Write-Host "Product ID: $PRODUCT_ID`n" -ForegroundColor Yellow

# TEST 1: Health
Write-Host "TEST 1: Health Check... " -NoNewline
try {
    $r = Invoke-RestMethod "$API_URL/health"
    if ($r.status -eq "OK") { Write-Host "PASS" -F Green; $TESTS_PASSED++ } else { throw }
} catch { Write-Host "FAIL" -F Red; $TESTS_FAILED++ }

# TEST 2: Create Product
Write-Host "TEST 2: Create Product... " -NoNewline
try {
    $body = @{id=$PRODUCT_ID; name="Rice"; batch="B001"; origin="An Giang"; manufactureDate="2025-11-26"} | ConvertTo-Json
    $r = Invoke-RestMethod "$API_URL/api/v2/products" -Method POST -Headers @{"Content-Type"="application/json";"X-User-Identity"="manufacturer:user1"} -Body $body
    if ($r.success) { Write-Host "PASS" -F Green; $TESTS_PASSED++; Start-Sleep 2 } else { throw }
} catch { Write-Host "FAIL: $($_.Exception.Message)" -F Red; $TESTS_FAILED++ }

# TEST 3: Get Product
Write-Host "TEST 3: Get Product... " -NoNewline
try {
    $r = Invoke-RestMethod "$API_URL/api/v2/products/$PRODUCT_ID" -Headers @{"X-User-Identity"="manufacturer:user1"}
    if ($r.success -and $r.data.id -eq $PRODUCT_ID) { Write-Host "PASS" -F Green; $TESTS_PASSED++ } else { throw }
} catch { Write-Host "FAIL" -F Red; $TESTS_FAILED++ }

# TEST 4: Get All Products
Write-Host "TEST 4: Get All Products... " -NoNewline
try {
    $r = Invoke-RestMethod "$API_URL/api/v2/products" -Headers @{"X-User-Identity"="manufacturer:user1"}
    if ($r.success) { Write-Host "PASS ($($r.count) products)" -F Green; $TESTS_PASSED++ } else { throw }
} catch { Write-Host "FAIL" -F Red; $TESTS_FAILED++ }

# TEST 5: Authorization Check
Write-Host "TEST 5: Auth Check (Shipper Create)... " -NoNewline
try {
    $body = @{id="PROD-FAIL"; name="Test"; batch="B001"; origin="Test"; manufactureDate="2025-11-26"} | ConvertTo-Json
    try {
        $r = Invoke-RestMethod "$API_URL/api/v2/products" -Method POST -Headers @{"Content-Type"="application/json";"X-User-Identity"="shipper:user1"} -Body $body -ErrorAction Stop
        throw "Should be rejected"
    } catch {
        if ($_.Exception.Message -match "403") { Write-Host "PASS (Rejected)" -F Green; $TESTS_PASSED++ } else { throw }
    }
} catch { Write-Host "FAIL" -F Red; $TESTS_FAILED++ }

# Summary
Write-Host "`n======================================" -ForegroundColor Cyan
Write-Host "PASSED: $TESTS_PASSED | FAILED: $TESTS_FAILED" -ForegroundColor $(if($TESTS_FAILED -eq 0){"Green"}else{"Red"})
Write-Host "======================================`n" -ForegroundColor Cyan

if ($TESTS_FAILED -eq 0) { exit 0 } else { exit 1 }