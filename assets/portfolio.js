'use strict';
const menuToggle = document.querySelector('.menu-toggle');
const mobileNav = document.getElementById('mobile-nav');
const desktopLayout = window.matchMedia('(min-width: 701px)');
function closeMenu() {
  mobileNav.hidden = true;
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', 'Open navigation');
}
desktopLayout.addEventListener('change', event => { if (event.matches) closeMenu(); });
menuToggle.addEventListener('click', () => {
  const open = menuToggle.getAttribute('aria-expanded') !== 'true';
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  mobileNav.hidden = !open;
});
mobileNav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  closeMenu();
}));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !mobileNav.hidden) {
    mobileNav.hidden = true;
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Open navigation');
    menuToggle.focus();
  }
});
const projects = [...document.querySelectorAll('.project')];
document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => {
  const category = button.dataset.filter;
  document.querySelectorAll('.filter').forEach(filter => {
    filter.classList.toggle('active', filter === button);
    filter.setAttribute('aria-pressed', String(filter === button));
  });
  projects.forEach(project => { project.hidden = category !== 'all' && project.dataset.category !== category; });
  document.getElementById('filter-status').textContent = `Showing ${projects.filter(project => !project.hidden).length} ${category === 'all' ? 'projects' : category === 'web' ? 'website and tool projects' : 'Android app projects'}`;
}));
const projectNotes = {
  gstwali: { title: 'GSTWali', category: 'WEBSITE + WEB APPLICATION', description: 'A product for marketplace sellers and Chartered Accountants to organise sales and returns reports, review figures, and prepare GSTR-1 JSON files and Excel summaries. Final filing takes place on the GST portal.', learning: 'Helps online sellers and accountants organise sales reports, check the figures and prepare files for GST filing. Final filing happens on the GST portal.', url: 'https://gstwali.in/' },
  splitter: { title: 'Auto Video Splitter', category: 'PUBLISHED ANDROID APPLICATION', description: 'A video utility that splits a longer video into shorter, ordered clips for sharing. Its Google Play listing showed the 10K+ download band when checked on 20 October 2026. Downloads are not a measure of active users.', learning: 'Helps people turn a longer video into shorter clips they can share. You can open the Google Play listing to see the app and install it.', url: 'https://play.google.com/store/apps/details?id=com.splitvideoforwhatsapp' },
  labels: { title: 'Quick Label Crop', category: 'WEBSITE + ONLINE TOOL', description: 'A website offering shipping-label cropping and PDF tools for marketplace sellers, including tools for Flipkart and Meesho labels.', learning: 'Helps online sellers prepare shipping labels for printing. Open the website to try the available label and PDF tools.', url: 'https://quicklabelcrop.com/' },
  zeropath: { title: 'ZeroPath', category: 'PUBLISHED ANDROID APPLICATION', description: 'A personal finance utility for tracking loans and EMIs, viewing repayment schedules, setting reminders and exploring prepayment scenarios.', learning: 'Helps users view loans, upcoming EMIs and repayment calculations in one app. It is a planning tool, not personalised financial advice.', url: 'https://play.google.com/store/apps/details?id=com.arjunyadav.zeropath' }
};
const dialog = document.getElementById('project-dialog');
let dialogTrigger = null;
document.querySelectorAll('[data-project]').forEach(button => button.addEventListener('click', () => {
  const project = projectNotes[button.dataset.project];
  dialogTrigger = button;
  document.getElementById('dialog-category').textContent = project.category;
  document.getElementById('dialog-title').textContent = project.title;
  document.getElementById('dialog-description').textContent = project.description;
  document.getElementById('dialog-learning').textContent = project.learning;
  document.getElementById('dialog-link').href = project.url;
  dialog.showModal();
}));
dialog.addEventListener('close', () => {
  if (dialogTrigger && document.contains(dialogTrigger)) dialogTrigger.focus({ preventScroll: true });
});
document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) { const box = dialog.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close(); } });
const form = document.getElementById('project-form');
let preparedBrief = '';
form.addEventListener('input', () => { document.getElementById('enquiry-result').hidden = true; });
form.addEventListener('change', () => { document.getElementById('enquiry-result').hidden = true; });
form.addEventListener('submit', event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const name = String(data.get('name') || '').trim();
  const business = String(data.get('business') || '').trim();
  const service = String(data.get('service') || 'I’d like some guidance');
  const message = String(data.get('message') || '').trim();
  if (!name) {
    const input = document.getElementById('name');
    input.setCustomValidity('Please enter your name / अपना नाम लिखें।');
    input.reportValidity();
    input.addEventListener('input', () => input.setCustomValidity(''), { once: true });
    return;
  }
  preparedBrief = `Namaste Arjun, my name is ${name}.\n${business ? `Business: ${business}\n` : ''}I need help with: ${service}.${message ? `\n\n${message}` : ''}`;
  const whatsapp = `https://wa.me/918581955657?${new URLSearchParams({ text: preparedBrief })}`;
  document.getElementById('open-whatsapp').href = whatsapp;
  document.getElementById('brief-fallback').value = preparedBrief;
  document.getElementById('enquiry-result').hidden = false;
  document.getElementById('copy-status').textContent = '';
  document.getElementById('brief-fallback').hidden = true;
  document.getElementById('copy-brief').textContent = 'Copy message ⧉';
  document.getElementById('open-whatsapp').focus({ preventScroll: true });
  window.open(whatsapp, '_blank', 'noopener,noreferrer');
});
document.getElementById('copy-brief').addEventListener('click', async () => {
  const status = document.getElementById('copy-status');
  try {
    await navigator.clipboard.writeText(preparedBrief);
    status.textContent = 'Message copied. Paste it into WhatsApp for +91 85819 55657.';
    document.getElementById('copy-brief').textContent = 'Copied ✓';
  } catch {
    const fallback = document.getElementById('brief-fallback');
    fallback.hidden = false;
    fallback.focus();
    fallback.select();
    status.textContent = 'Select and copy your message below.';
  }
});
document.getElementById('year').textContent = String(new Date().getFullYear());

// Reveal enhanced controls only after their handlers are ready. Direct contact always works.
form.hidden = false;
document.querySelector('.filters').hidden = false;
if (typeof dialog.showModal === 'function') {
  document.querySelectorAll('[data-project]').forEach(button => { button.hidden = false; });
}
