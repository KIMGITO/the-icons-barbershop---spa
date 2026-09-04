export const emailTemplate = (content: string, cta?: { text: string; url: string }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f4f4f4;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 10px rgba(0,0,0,0.1);
    }
    .header {
      background-color: #1a1a1a;
      padding: 30px;
      text-align: center;
    }
    .header img {
      max-width: 150px;
    }
    .header h1 {
      color: #d4af37;
      margin: 10px 0 0;
      font-size: 24px;
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    .content {
      padding: 40px;
    }
    .footer {
      background-color: #f9f9f9;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #777;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background-color: #d4af37;
      color: #000;
      text-decoration: none;
      border-radius: 5px;
      font-weight: bold;
      margin-top: 20px;
    }
    .brand-color {
      color: #d4af37;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>The Icons</h1>
      <div style="color: #fff; font-size: 12px;">BARBER & SPA</div>
    </div>
    <div class="content">
      ${content}
      ${cta ? `<center><a href="${cta.url}" class="button">${cta.text}</a></center>` : ''}
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} The Icons Barber & Spa. All rights reserved.</p>
      <p>Luxury Grooming & Wellness</p>
    </div>
  </div>
</body>
</html>
`;
