'use strict';
const menuToggle = document.querySelector('.menu-toggle');
const mobileNav = document.getElementById('mobile-nav');
menuToggle.addEventListener('click', () => {
  const open = menuToggle.getAttribute('aria-expanded') !== 'true';
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  mobileNav.hidden = !open;
});
mobileNav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  mobileNav.hidden = true;
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', 'Open navigation');
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
  gstwali: { title: 'GSTWali', category: 'WEBSITE + WEB APPLICATION', description: 'A product for marketplace sellers and Chartered Accountants to organise sales and returns reports, review figures, and prepare GSTR-1 JSON files and Excel summaries. Final filing takes place on the GST portal.', learning: 'Organising a multi-step business workflow into a more understandable web experience: upload, review and export. Explore the live website for supported formats and the current service.', url: 'https://gstwali.in/' },
  splitter: { title: 'Auto Video Splitter', category: 'PUBLISHED ANDROID APPLICATION', description: 'A video utility that splits a longer video into shorter, ordered clips for sharing. Its Google Play listing showed the 10K+ download band when checked on 20 October 2026. Downloads are not a measure of active users.', learning: 'Designing a focused mobile utility around a repeatable task, and taking an Android product through publication and ongoing updates.', url: 'https://play.google.com/store/apps/details?id=com.splitvideoforwhatsapp' },
  labels: { title: 'Quick Label Crop', category: 'WEBSITE + ONLINE TOOL', description: 'A website offering shipping-label cropping and PDF tools for marketplace sellers, including tools for Flipkart and Meesho labels.', learning: 'Building a task-focused website that helps users move from a specific need to the relevant utility. The live tools show the current functionality.', url: 'https://quicklabelcrop.com/' },
  zeropath: { title: 'ZeroPath', category: 'PUBLISHED ANDROID APPLICATION', description: 'A personal finance utility for tracking loans and EMIs, viewing repayment schedules, setting reminders and exploring prepayment scenarios.', learning: 'Turning a set of related calculations and recurring information needs into a mobile interface. The app is a planning tool, not personalised financial advice.', url: 'https://play.google.com/store/apps/details?id=com.arjunyadav.zeropath' }
};
const dialog = document.getElementById('project-dialog');
document.querySelectorAll('[data-project]').forEach(button => button.addEventListener('click', () => {
  const project = projectNotes[button.dataset.project];
  document.getElementById('dialog-category').textContent = project.category;
  document.getElementById('dialog-title').textContent = project.title;
  document.getElementById('dialog-description').textContent = project.description;
  document.getElementById('dialog-learning').textContent = project.learning;
  document.getElementById('dialog-link').href = project.url;
  dialog.showModal();
}));
document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) { const box = dialog.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close(); } });
document.querySelectorAll('[data-service]').forEach(link => link.addEventListener('click', () => { document.getElementById('service').value = link.dataset.service; }));
const form = document.getElementById('project-form');
let preparedBrief = '';
form.addEventListener('submit', event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const name = String(data.get('name')).trim();
  const email = String(data.get('email')).trim();
  const business = String(data.get('business')).trim();
  const service = String(data.get('service'));
  const message = String(data.get('message')).trim();
  if (!name || !business || !message) {
    const emptyField = !name ? 'name' : !business ? 'business' : 'message';
    const input = document.getElementById(emptyField);
    input.setCustomValidity('Please add a little detail here.');
    input.reportValidity();
    input.addEventListener('input', () => input.setCustomValidity(''), { once: true });
    return;
  }
  preparedBrief = `Hello Arjun,\n\nI’d like to discuss a project.\n\nName: ${name}\nEmail: ${email}\nBusiness / project: ${business}\nInterested in: ${service}\n\nWhat I have in mind:\n${message}\n\nThank you,\n${name}`;
  const subject = `${service} enquiry — ${business}`;
  const mailto = `mailto:arjunyadav.ps@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(preparedBrief)}`;
  document.getElementById('open-draft').href = mailto;
  document.getElementById('brief-fallback').value = preparedBrief;
  const result = document.getElementById('email-result');
  result.hidden = false;
  document.getElementById('copy-status').textContent = '';
  document.getElementById('brief-fallback').hidden = true;
  document.getElementById('copy-brief').textContent = 'Copy brief ⧉';
  result.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'nearest' });
});
document.getElementById('copy-brief').addEventListener('click', async () => {
  const status = document.getElementById('copy-status');
  try {
    await navigator.clipboard.writeText(preparedBrief);
    status.textContent = 'Brief copied. Paste it into an email to arjunyadav.ps@gmail.com.';
    document.getElementById('copy-brief').textContent = 'Copied ✓';
  } catch {
    const fallback = document.getElementById('brief-fallback');
    fallback.hidden = false;
    fallback.focus();
    fallback.select();
    status.textContent = 'Select and copy the brief below, then paste it into your email.';
  }
});
document.getElementById('year').textContent = String(new Date().getFullYear());
