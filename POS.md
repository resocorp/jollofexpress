Here's a complete reference of all working commands:
Complete Test Script - All Features
powershell# Complete POS Printer Feature Test
$ip = "192.168.100.160"
$port = 9100

$client = New-Object System.Net.Sockets.TcpClient($ip, $port)
$stream = $client.GetStream()

# ========================================
# 1. BOLD TEXT
# ========================================
$text = [System.Text.Encoding]::ASCII.GetBytes("Normal text`n")
$stream.Write($text, 0, $text.Length)

$boldOn = [byte[]](0x1B, 0x45, 0x01)
$stream.Write($boldOn, 0, $boldOn.Length)

$text = [System.Text.Encoding]::ASCII.GetBytes("BOLD TEXT`n")
$stream.Write($text, 0, $text.Length)

$boldOff = [byte[]](0x1B, 0x45, 0x00)
$stream.Write($boldOff, 0, $boldOff.Length)

$text = [System.Text.Encoding]::ASCII.GetBytes("`n")
$stream.Write($text, 0, $text.Length)

# ========================================
# 2. TEXT SIZES
# ========================================
$text = [System.Text.Encoding]::ASCII.GetBytes("Normal size`n")
$stream.Write($text, 0, $text.Length)

$doubleHeight = [byte[]](0x1B, 0x21, 0x10)
$stream.Write($doubleHeight, 0, $doubleHeight.Length)
$text = [System.Text.Encoding]::ASCII.GetBytes("Double height`n")
$stream.Write($text, 0, $text.Length)

$doubleWidth = [byte[]](0x1B, 0x21, 0x20)
$stream.Write($doubleWidth, 0, $doubleWidth.Length)
$text = [System.Text.Encoding]::ASCII.GetBytes("Double width`n")
$stream.Write($text, 0, $text.Length)

$large = [byte[]](0x1B, 0x21, 0x30)
$stream.Write($large, 0, $large.Length)
$text = [System.Text.Encoding]::ASCII.GetBytes("LARGE`n")
$stream.Write($text, 0, $text.Length)

$normal = [byte[]](0x1B, 0x21, 0x00)
$stream.Write($normal, 0, $normal.Length)

$text = [System.Text.Encoding]::ASCII.GetBytes("`n")
$stream.Write($text, 0, $text.Length)

# ========================================
# 3. UNDERLINE
# ========================================
$underlineOn = [byte[]](0x1B, 0x2D, 0x01)
$stream.Write($underlineOn, 0, $underlineOn.Length)

$text = [System.Text.Encoding]::ASCII.GetBytes("Underlined text`n")
$stream.Write($text, 0, $text.Length)

$underlineOff = [byte[]](0x1B, 0x2D, 0x00)
$stream.Write($underlineOff, 0, $underlineOff.Length)

$text = [System.Text.Encoding]::ASCII.GetBytes("`n")
$stream.Write($text, 0, $text.Length)

# ========================================
# 4. INVERTED (White on Black)
# ========================================
$reverseOn = [byte[]](0x1D, 0x42, 0x01)
$stream.Write($reverseOn, 0, $reverseOn.Length)

$text = [System.Text.Encoding]::ASCII.GetBytes("WHITE ON BLACK`n")
$stream.Write($text, 0, $text.Length)

$reverseOff = [byte[]](0x1D, 0x42, 0x00)
$stream.Write($reverseOff, 0, $reverseOff.Length)

$text = [System.Text.Encoding]::ASCII.GetBytes("`n")
$stream.Write($text, 0, $text.Length)

# ========================================
# 5. CENTER ALIGNMENT
# ========================================
$center = [byte[]](0x1B, 0x61, 0x01)
$stream.Write($center, 0, $center.Length)

$text = [System.Text.Encoding]::ASCII.GetBytes("CENTER ALIGNED`n`n")
$stream.Write($text, 0, $text.Length)

$left = [byte[]](0x1B, 0x61, 0x00)
$stream.Write($left, 0, $left.Length)

# ========================================
# 6. BARCODE (CODE39)
# ========================================
$text = [System.Text.Encoding]::ASCII.GetBytes("Barcode:`n")
$stream.Write($text, 0, $text.Length)

$height = [byte[]](0x1D, 0x68, 0x64)
$stream.Write($height, 0, $height.Length)

$width = [byte[]](0x1D, 0x77, 0x03)
$stream.Write($width, 0, $width.Length)

$hri = [byte[]](0x1D, 0x48, 0x02)
$stream.Write($hri, 0, $hri.Length)

$barcodeData = [System.Text.Encoding]::ASCII.GetBytes("ABC123")
$barcodeCmd = [byte[]](0x1D, 0x6B, 0x04) + $barcodeData + [byte[]](0x00)
$stream.Write($barcodeCmd, 0, $barcodeCmd.Length)

$text = [System.Text.Encoding]::ASCII.GetBytes("`n`n")
$stream.Write($text, 0, $text.Length)

# ========================================
# 7. QR CODE
# ========================================
$stream.Write($center, 0, $center.Length)

$text = [System.Text.Encoding]::ASCII.GetBytes("QR Code:`n")
$stream.Write($text, 0, $text.Length)

$qrUrl = "https://github.com"
$qrBytes = [System.Text.Encoding]::ASCII.GetBytes($qrUrl)
$qrLen = $qrBytes.Length + 3
$pL = $qrLen -band 0xFF
$pH = ($qrLen -shr 8) -band 0xFF

$qrStore = [byte[]](0x1D, 0x28, 0x6B, $pL, $pH, 0x31, 0x50, 0x30) + $qrBytes
$stream.Write($qrStore, 0, $qrStore.Length)

$qrPrint = [byte[]](0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30)
$stream.Write($qrPrint, 0, $qrPrint.Length)

$stream.Write($left, 0, $left.Length)

$text = [System.Text.Encoding]::ASCII.GetBytes("`n`n`n")
$stream.Write($text, 0, $text.Length)

# ========================================
# 8. PAPER CUT
# ========================================
$cut = [byte[]](0x1D, 0x56, 0x00)
$stream.Write($cut, 0, $cut.Length)

$stream.Close()
$client.Close()

Write-Host "Complete feature test printed!"
Quick Reference Table
FeatureCommand HexWorkingBold ON1B 45 01✅Bold OFF1B 45 00✅Underline ON1B 2D 01✅Underline OFF1B 2D 00✅Double Height1B 21 10✅Double Width1B 21 20✅Large (Both)1B 21 30✅Normal Size1B 21 00✅Inverted ON1D 42 01✅Inverted OFF1D 42 00✅Left Align1B 61 00✅Center Align1B 61 01✅Right Align1B 61 02✅Cut Paper1D 56 00✅QR Code Store1D 28 6B pL pH 31 50 30 [data]✅QR Code Print1D 28 6B 03 00 31 51 30✅Barcode CODE391D 6B 04 [data] 00✅
Reusable Function - Print Receipt with QR
powershellfunction Print-Receipt {
    param(
        [string]$storeName = "MY STORE",
        [string]$address = "123 Main St",
        [hashtable[]]$items = @(),
        [string]$qrUrl = "https://example.com",
        [string]$ip = "192.168.100.160"
    )
    
    $port = 9100
    $client = New-Object System.Net.Sockets.TcpClient($ip, $port)
    $stream = $client.GetStream()
    
    # Center + Large header
    $center = [byte[]](0x1B, 0x61, 0x01)
    $stream.Write($center, 0, $center.Length)
    
    $large = [byte[]](0x1B, 0x21, 0x30)
    $stream.Write($large, 0, $large.Length)
    
    $text = [System.Text.Encoding]::ASCII.GetBytes("$storeName`n")
    $stream.Write($text, 0, $text.Length)
    
    $normal = [byte[]](0x1B, 0x21, 0x00)
    $stream.Write($normal, 0, $normal.Length)
    
    $text = [System.Text.Encoding]::ASCII.GetBytes("$address`n")
    $stream.Write($text, 0, $text.Length)
    
    # Left align for items
    $left = [byte[]](0x1B, 0x61, 0x00)
    $stream.Write($left, 0, $left.Length)
    
    $line = [System.Text.Encoding]::ASCII.GetBytes("================================`n")
    $stream.Write($line, 0, $line.Length)
    
    # Print items
    $total = 0
    foreach ($item in $items) {
        $itemLine = "{0,-20} `${1,6:F2}`n" -f $item.Name, $item.Price
        $text = [System.Text.Encoding]::ASCII.GetBytes($itemLine)
        $stream.Write($text, 0, $text.Length)
        $total += $item.Price
    }
    
    $separator = [System.Text.Encoding]::ASCII.GetBytes("--------------------------------`n")
    $stream.Write($separator, 0, $separator.Length)
    
    # Bold total
    $boldOn = [byte[]](0x1B, 0x45, 0x01)
    $stream.Write($boldOn, 0, $boldOn.Length)
    
    $totalLine = "TOTAL:               `${0,6:F2}`n" -f $total
    $text = [System.Text.Encoding]::ASCII.GetBytes($totalLine)
    $stream.Write($text, 0, $text.Length)
    
    $boldOff = [byte[]](0x1B, 0x45, 0x00)
    $stream.Write($boldOff, 0, $boldOff.Length)
    
    $stream.Write($line, 0, $line.Length)
    
    # Center for QR
    $stream.Write($center, 0, $center.Length)
    
    $qrLabel = [System.Text.Encoding]::ASCII.GetBytes("`nScan for details:`n")
    $stream.Write($qrLabel, 0, $qrLabel.Length)
    
    # QR Code
    $qrBytes = [System.Text.Encoding]::ASCII.GetBytes($qrUrl)
    $qrLen = $qrBytes.Length + 3
    $pL = $qrLen -band 0xFF
    $pH = ($qrLen -shr 8) -band 0xFF
    
    $qrStore = [byte[]](0x1D, 0x28, 0x6B, $pL, $pH, 0x31, 0x50, 0x30) + $qrBytes
    $stream.Write($qrStore, 0, $qrStore.Length)
    
    $qrPrint = [byte[]](0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30)
    $stream.Write($qrPrint, 0, $qrPrint.Length)
    
    # Thank you
    $thanks = [System.Text.Encoding]::ASCII.GetBytes("`nThank you!`n`n`n")
    $stream.Write($thanks, 0, $thanks.Length)
    
    # Cut
    $cut = [byte[]](0x1D, 0x56, 0x00)
    $stream.Write($cut, 0, $cut.Length)
    
    $stream.Close()
    $client.Close()
    
    Write-Host "Receipt printed! Total: `$$($total)"
}

# Usage example:
Print-Receipt -storeName "COFFEE SHOP" -address "456 Oak Avenue" -items @(
    @{Name="Cappuccino"; Price=4.50},
    @{Name="Croissant"; Price=3.00},
    @{Name="Orange Juice"; Price=3.50}
) -qrUrl "https://coffeeshop.com/receipt/001"