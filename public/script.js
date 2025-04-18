async function readEmails() {
    const email = document.getElementById('emailInput').value;
    if (!email) {
      alert('Vui lòng nhập email!');
      return;
    }
    try {
      const response = await fetch('/read-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (response.status === 500) {
        window.location.href = `/auth?email=${encodeURIComponent(email)}`;
        return;
      }
      const emails = await response.json();
      const emailList = document.getElementById('emailList');
      emailList.innerHTML = emails.map(e => `
        <div>
          <h3>${e.subject}</h3>
          <p>${e.text}</p>
          <div>${e.images.map(img => `<img src="data:image/jpeg;base64,${img.data}" alt="${img.filename}">`).join('')}</div>
          <ul>${e.links.map(link => `<li><a href="${link}">${link}</a></li>`).join('')}</ul>
        </div>
      `).join('');
    } catch (error) {
      console.error('Lỗi:', error);
      alert('Có lỗi xảy ra, vui lòng thử lại.');
    }
  }