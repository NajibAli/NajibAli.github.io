
// Smooth scrolling voor navigatie links

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();

        const targetId = this.getAttribute('href');
        if (targetId === '#') return;

        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            window.scrollTo({
                top: targetElement.offsetTop - 80,
                behavior: 'smooth'
            });
        }
    });
});



// Contactformulier verzending

const contactForm = document.querySelector('.contact-form');

if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const name = this.querySelector('input[type="text"]').value;
        const email = this.querySelector('input[type="email"]').value;
        const message = this.querySelector('textarea').value;

        if (name && email && message) {
            alert(`Bedankt ${name}! Je bericht is verzonden. Ik neem snel contact op.`);
            this.reset();
        } else {
            alert('Vul alle velden in.');
        }
    });
}



// Navbar schaduw bij scrollen

window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');

    if (window.scrollY > 50) {
        navbar.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)';
    } else {
        navbar.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
    }
});



// Animaties voor vaardigheden balken

const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const skillLevel = entry.target;
            const width = skillLevel.style.width;

            skillLevel.style.width = '0';

            setTimeout(() => {
                skillLevel.style.transition = 'width 1.5s ease-in-out';
                skillLevel.style.width = width;
            }, 300);
        }
    });
}, {
    threshold: 0.5
});

document.querySelectorAll('.skill-level').forEach(skill => {
    observer.observe(skill);
});



// Mobile menu toggle

function toggleMobileMenu() {
    const navMenu = document.querySelector('.nav-menu');

    if (navMenu.style.display === 'flex') {
        navMenu.style.display = 'none';
    } else {
        navMenu.style.display = 'flex';
        navMenu.style.flexDirection = 'column';
        navMenu.style.position = 'absolute';
        navMenu.style.top = '100%';
        navMenu.style.left = '0';
        navMenu.style.right = '0';
        navMenu.style.background = 'white';
        navMenu.style.padding = '20px';
        navMenu.style.boxShadow = '0 10px 30px rgba(0,0,0,0.1)';
    }
}



// Hamburger menu toevoegen op mobiel

if (window.innerWidth <= 768) {
    const navbar = document.querySelector('.navbar .container');
    const hamburger = document.createElement('button');

    hamburger.innerHTML = '☰';
    hamburger.style.background = 'none';
    hamburger.style.border = 'none';
    hamburger.style.fontSize = '1.5rem';
    hamburger.style.cursor = 'pointer';

    hamburger.addEventListener('click', toggleMobileMenu);
    navbar.appendChild(hamburger);
}
