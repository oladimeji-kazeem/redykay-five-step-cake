<?php
/**
 * Redycakes Studio — Hostinger SMTP Email Relay
 * Host: smtp.hostinger.com | Port: 465 (SSL)
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=utf-8');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Configuration defaults
$default_smtp_host = 'smtp.hostinger.com';
$default_smtp_port = 465;
$default_from_email = 'hello@redycakes.org';
$default_from_name = 'Redycakes Cake Studio';
$default_to_email = 'hello@redycakes.org';

// Get request payload
$raw_input = file_get_contents('php://input');
$data = [];
if (!empty($raw_input)) {
    $data = json_decode($raw_input, true) ?: [];
}

// Allow GET test ping
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    echo json_encode([
        'status' => 'online',
        'service' => 'Redycakes Hostinger SMTP Mailer',
        'smtp_host' => $default_smtp_host,
        'smtp_port' => $default_smtp_port,
        'protocol' => 'ssl',
        'default_recipient' => $default_to_email,
        'timestamp' => date('c'),
    ]);
    exit;
}

// Extract parameters
$to = trim($data['to'] ?? $default_to_email);
$cc = trim($data['cc'] ?? '');
$reply_to = trim($data['reply_to'] ?? $cc);
$subject = trim($data['subject'] ?? 'New Message from Redycakes Website');
$message_text = trim($data['message'] ?? $data['text'] ?? '');
$visitor_name = trim($data['visitor_name'] ?? $data['name'] ?? 'Storefront Visitor');
$visitor_email = trim($data['visitor_email'] ?? $data['email'] ?? $cc);
$visitor_phone = trim($data['visitor_phone'] ?? $data['phone'] ?? '');

$smtp_host = trim($data['smtp_host'] ?? getenv('HOSTINGER_SMTP_HOST') ?: $default_smtp_host);
$smtp_port = intval($data['smtp_port'] ?? getenv('HOSTINGER_SMTP_PORT') ?: $default_smtp_port);
$smtp_user = trim($data['smtp_user'] ?? getenv('HOSTINGER_SMTP_USER') ?: $default_from_email);
$smtp_pass = trim($data['smtp_pass'] ?? getenv('HOSTINGER_SMTP_PASS') ?: '');
$from_name = trim($data['from_name'] ?? $default_from_name);
$from_email = trim($data['from_email'] ?? $smtp_user ?: $default_from_email);

$is_test = !empty($data['is_test']) || !empty($data['test']);

// Build HTML email template
if (!empty($data['html'])) {
    $body_html = $data['html'];
} else {
    $safe_visitor = htmlspecialchars($visitor_name, ENT_QUOTES, 'UTF-8');
    $safe_email = htmlspecialchars($visitor_email, ENT_QUOTES, 'UTF-8');
    $safe_phone = htmlspecialchars($visitor_phone, ENT_QUOTES, 'UTF-8');
    $safe_subject = htmlspecialchars($subject, ENT_QUOTES, 'UTF-8');
    $safe_message = nl2br(htmlspecialchars($message_text, ENT_QUOTES, 'UTF-8'));
    $date_formatted = date('d M Y, H:i (T)');

    $body_html = <<<HTML
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>{$safe_subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9f8f6; color: #231f20; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e7e5e4; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #7c3aed 0%, #9333ea 100%); color: #ffffff; padding: 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.5px; }
    .header p { margin: 6px 0 0; opacity: 0.9; font-size: 13px; }
    .content { padding: 24px; line-height: 1.6; font-size: 14px; }
    .meta-box { background: #fbfbfa; border: 1px solid #e7e5e4; border-radius: 12px; padding: 16px; margin-bottom: 20px; }
    .meta-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
    .meta-row:last-child { margin-bottom: 0; }
    .meta-label { color: #78716c; font-weight: 600; width: 120px; }
    .meta-value { color: #1c1917; font-weight: 500; }
    .message-box { background: #faf5ff; border: 1px solid #f3e8ff; border-left: 4px solid #9333ea; border-radius: 8px; padding: 16px; margin: 20px 0; font-size: 14px; }
    .footer { background: #f5f5f4; border-top: 1px solid #e7e5e4; padding: 16px; text-align: center; font-size: 12px; color: #78716c; }
    .footer a { color: #7c3aed; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Redycakes Cake Studio</h1>
      <p>Live Chat & Storefront Inquiry</p>
    </div>
    <div class="content">
      <div class="meta-box">
        <div class="meta-row"><span class="meta-label">Visitor:</span><span class="meta-value">{$safe_visitor}</span></div>
        <div class="meta-row"><span class="meta-label">Email:</span><span class="meta-value"><a href="mailto:{$safe_email}">{$safe_email}</a></span></div>
        <div class="meta-row"><span class="meta-label">Phone:</span><span class="meta-value">{$safe_phone}</span></div>
        <div class="meta-row"><span class="meta-label">Date:</span><span class="meta-value">{$date_formatted}</span></div>
      </div>
      <p style="margin: 0 0 10px; font-weight: 600; color: #44403c;">Message Content:</p>
      <div class="message-box">
        {$safe_message}
      </div>
      <p style="font-size: 12px; color: #78716c; margin-top: 24px;">
        This transcript has been sent to <strong>hello@redycakes.org</strong> and copied to <strong>{$safe_email}</strong>.
      </p>
    </div>
    <div class="footer">
      Redycakes Artisanal Bespoke Cakes &middot; London &amp; South East<br>
      <a href="https://www.redycakes.org/cms">Open CMS Admin Studio</a> &middot; <a href="https://www.redycakes.org">Visit Storefront</a>
    </div>
  </div>
</body>
</html>
HTML;
}

/**
 * Perform SMTP socket communication with smtp.hostinger.com:465
 */
function send_hostinger_smtp($host, $port, $user, $pass, $from_email, $from_name, $to, $cc, $reply_to, $subject, $html_body, $text_body) {
    $log = [];
    $socket_target = 'ssl://' . $host . ':' . $port;

    $context = stream_context_create([
        'ssl' => [
            'verify_peer' => false,
            'verify_peer_name' => false,
            'allow_self_signed' => true,
        ]
    ]);

    $socket = @stream_socket_client($socket_target, $errno, $errstr, 15, STREAM_CLIENT_CONNECT, $context);
    if (!$socket) {
        return ['success' => false, 'error' => "Could not connect to {$socket_target}: ({$errno}) {$errstr}", 'log' => $log];
    }

    stream_set_timeout($socket, 15);

    function read_response($socket, &$log) {
        $response = '';
        while ($line = fgets($socket, 515)) {
            $response .= $line;
            if (substr($line, 3, 1) === ' ') break;
        }
        $log[] = 'SERVER: ' . trim($response);
        return $response;
    }

    function send_cmd($socket, $cmd, &$log) {
        $log[] = 'CLIENT: ' . (strpos($cmd, 'AUTH') === 0 ? 'AUTH ...' : trim($cmd));
        fwrite($socket, $cmd . "\r\n");
    }

    // 1. Initial 220 banner
    $res = read_response($socket, $log);
    if (substr($res, 0, 3) !== '220') {
        fclose($socket);
        return ['success' => false, 'error' => "Unexpected banner: {$res}", 'log' => $log];
    }

    // 2. EHLO
    send_cmd($socket, "EHLO [127.0.0.1]", $log);
    $res = read_response($socket, $log);
    if (substr($res, 0, 3) !== '250') {
        fclose($socket);
        return ['success' => false, 'error' => "EHLO failed: {$res}", 'log' => $log];
    }

    // 3. AUTH LOGIN if credentials provided
    if (!empty($user) && !empty($pass)) {
        send_cmd($socket, "AUTH LOGIN", $log);
        $res = read_response($socket, $log);
        if (substr($res, 0, 3) !== '334') {
            fclose($socket);
            return ['success' => false, 'error' => "AUTH LOGIN rejected: {$res}", 'log' => $log];
        }

        // Send base64 username
        send_cmd($socket, base64_encode($user), $log);
        $res = read_response($socket, $log);
        if (substr($res, 0, 3) !== '334') {
            fclose($socket);
            return ['success' => false, 'error' => "Username rejected: {$res}", 'log' => $log];
        }

        // Send base64 password
        send_cmd($socket, base64_encode($pass), $log);
        $res = read_response($socket, $log);
        if (substr($res, 0, 3) !== '235') {
            fclose($socket);
            return ['success' => false, 'error' => "Authentication failed: {$res}", 'log' => $log];
        }
    }

    // 4. MAIL FROM
    send_cmd($socket, "MAIL FROM:<{$from_email}>", $log);
    $res = read_response($socket, $log);
    if (substr($res, 0, 3) !== '250') {
        fclose($socket);
        return ['success' => false, 'error' => "MAIL FROM rejected: {$res}", 'log' => $log];
    }

    // 5. RCPT TO (Main recipient)
    send_cmd($socket, "RCPT TO:<{$to}>", $log);
    $res = read_response($socket, $log);
    if (substr($res, 0, 3) !== '250') {
        fclose($socket);
        return ['success' => false, 'error' => "RCPT TO <{$to}> rejected: {$res}", 'log' => $log];
    }

    // 6. RCPT TO (CC sender copy)
    if (!empty($cc) && $cc !== $to && filter_var($cc, FILTER_VALIDATE_EMAIL)) {
        send_cmd($socket, "RCPT TO:<{$cc}>", $log);
        $res = read_response($socket, $log);
        // Note: CC might return 250 or 251
    }

    // 7. DATA
    send_cmd($socket, "DATA", $log);
    $res = read_response($socket, $log);
    if (substr($res, 0, 3) !== '354') {
        fclose($socket);
        return ['success' => false, 'error' => "DATA rejected: {$res}", 'log' => $log];
    }

    // 8. Headers & Body MIME formatting
    $boundary = '----=_NextPart_' . md5(time() . rand());
    $encoded_subject = '=?UTF-8?B?' . base64_encode($subject) . '?=';

    $headers = [];
    $headers[] = "Date: " . date('r');
    $headers[] = "From: =?UTF-8?B?" . base64_encode($from_name) . "?= <{$from_email}>";
    $headers[] = "To: <{$to}>";
    if (!empty($cc)) {
        $headers[] = "Cc: <{$cc}>";
    }
    if (!empty($reply_to)) {
        $headers[] = "Reply-To: <{$reply_to}>";
    }
    $headers[] = "Subject: {$encoded_subject}";
    $headers[] = "MIME-Version: 1.0";
    $headers[] = "Content-Type: multipart/alternative; boundary=\"{$boundary}\"";
    $headers[] = "X-Mailer: Redycakes Hostinger SMTP Engine";

    $body = implode("\r\n", $headers) . "\r\n\r\n";

    // Plain text part
    $body .= "--{$boundary}\r\n";
    $body .= "Content-Type: text/plain; charset=UTF-8\r\n";
    $body .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
    $body .= $text_body . "\r\n\r\n";

    // HTML part
    $body .= "--{$boundary}\r\n";
    $body .= "Content-Type: text/html; charset=UTF-8\r\n";
    $body .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
    $body .= $html_body . "\r\n\r\n";

    $body .= "--{$boundary}--\r\n";

    // Replace solo dots at line start to conform with SMTP dot-stuffing
    $body = preg_replace('/^\./m', '..', $body);

    fwrite($socket, $body . "\r\n.\r\n");
    $res = read_response($socket, $log);
    if (substr($res, 0, 3) !== '250') {
        fclose($socket);
        return ['success' => false, 'error' => "Message transmission rejected: {$res}", 'log' => $log];
    }

    // 9. QUIT
    send_cmd($socket, "QUIT", $log);
    read_response($socket, $log);
    fclose($socket);

    return ['success' => true, 'log' => $log];
}

// Execute Hostinger SMTP dispatch
$result = send_hostinger_smtp(
    $smtp_host,
    $smtp_port,
    $smtp_user,
    $smtp_pass,
    $from_email,
    $from_name,
    $to,
    $cc,
    $reply_to,
    $subject,
    $body_html,
    $message_text
);

if ($result['success']) {
    echo json_encode([
        'success' => true,
        'message' => "Email sent successfully via {$smtp_host}:{$smtp_port}",
        'server' => "{$smtp_host}:{$smtp_port}",
        'to' => $to,
        'cc' => $cc,
        'subject' => $subject,
        'timestamp' => date('c'),
    ]);
} else {
    // If direct SMTP handshake failed (e.g. password empty), attempt PHP mail() fallback on Hostinger
    $fallback_sent = false;
    if (function_exists('mail')) {
        $headers = "From: {$from_name} <{$from_email}>\r\n";
        if (!empty($cc)) $headers .= "Cc: {$cc}\r\n";
        if (!empty($reply_to)) $headers .= "Reply-To: {$reply_to}\r\n";
        $headers .= "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
        $headers .= "X-Mailer: Redycakes Hostinger Fallback Mailer\r\n";

        $fallback_sent = @mail($to, $subject, $body_html, $headers);
    }

    if ($fallback_sent) {
        echo json_encode([
            'success' => true,
            'message' => "Dispatched via Hostinger mail transport (SMTP note: " . ($result['error'] ?? 'fallback') . ")",
            'server' => "{$smtp_host}:{$smtp_port}",
            'to' => $to,
            'cc' => $cc,
            'subject' => $subject,
            'timestamp' => date('c'),
        ]);
    } else {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $result['error'] ?? 'Failed to send email via Hostinger SMTP',
            'server' => "{$smtp_host}:{$smtp_port}",
            'log' => $is_test ? ($result['log'] ?? []) : null,
        ]);
    }
}
