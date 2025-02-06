document.addEventListener('DOMContentLoaded', () => {
    const items = document.querySelectorAll('.carousel-item');
    const heroSection = document.querySelector('.hero-section');
    const captions = document.createElement('div');
    captions.classList.add('carousel-caption');
    heroSection.appendChild(captions);

    let index = 0;

    const updateCaption = () => {
        const currentItem = items[index];
        const imageUrl = currentItem.getAttribute('data-image'); // Fetch image URL
        
        // Update hero section background
        heroSection.style.backgroundImage = `url(${imageUrl})`;

        // Update captions directly below the image
        captions.innerHTML = `
            <h2>${currentItem.getAttribute('data-message')}</h2>
            <p>${currentItem.getAttribute('data-subtext')}</p>
        `;

        index = (index + 1) % items.length;
    };

    updateCaption();
    setInterval(() => {
        updateCaption();
    }, 8000); // Match animation duration
});

document.addEventListener('DOMContentLoaded', () => {
    const toggler = document.getElementById("navbar-toggler");
    const cancel = document.getElementById("navbar-cancel");
    const navbarNav = document.getElementById("navbarNav");
    const navLinks = document.querySelectorAll(".nav-link");
    const donateButton = document.querySelector(".btn-success"); // Select Donate button
    const dropdownToggle = document.getElementById("aboutDropdown");
    const dropdownMenu = dropdownToggle ? dropdownToggle.nextElementSibling : null; // Ensure dropdown exists

    // Navbar toggler and cancel button functionality
    toggler.addEventListener("click", function () {
        toggler.style.display = "none"; // Hide toggler
        cancel.style.display = "block"; // Show cancel button
        navbarNav.classList.add("show"); // Open the navbar
    });

    cancel.addEventListener("click", function () {
        toggler.style.display = "block"; // Show toggler
        cancel.style.display = "none"; // Hide cancel button
        navbarNav.classList.remove("show"); // Collapse the navbar
    });

    // Close navbar when a nav-link OR donate button is clicked (on mobile)
    [...navLinks, donateButton].forEach(element => {
        element.addEventListener("click", function () {
            toggler.style.display = "block"; // Show toggler
            cancel.style.display = "none"; // Hide cancel button
            navbarNav.classList.remove("show"); // Collapse the navbar
        });
    });

    // Dropdown functionality for large screens (hover)
    if (dropdownToggle) {
        dropdownToggle.addEventListener("mouseenter", function () {
            const allItems = dropdownMenu.querySelectorAll(".dropdown-item");
            allItems.forEach(dropdownItem => {
                dropdownItem.style.display = "block"; // Show dropdown items on hover
            });
        });

        // Hide dropdown items when clicked on a dropdown item
        document.querySelectorAll(".dropdown-item").forEach(item => {
            item.addEventListener("click", function () {
                const allItems = dropdownMenu.querySelectorAll(".dropdown-item");
                allItems.forEach(dropdownItem => {
                    dropdownItem.style.display = "none"; // Hide dropdown items when clicked
                });
            });
        });
    }
});

document.addEventListener("DOMContentLoaded", function () {
    const contactForm = document.getElementById("contactForm");

    // Handle form submission
    contactForm.addEventListener("submit", async (event) => {
        event.preventDefault(); // Prevent default form submission behavior

        // Extract form data
        const formData = {
            name: document.getElementById("name").value.trim(),
            email: document.getElementById("email").value.trim(),
            message: document.getElementById("message").value.trim(),
        };

        // Validate form fields
        if (!formData.name || !formData.email || !formData.message) {
            alert("Please fill out all fields before submitting the form.");
            return;
        }

        try {
            // Submit form data to the server using Fetch API
            const response = await fetch("/send-message", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formData),
            });

            // Process response
            const result = await response.json();
            if (response.ok) {
                alert(result.message || "Your message has been sent successfully!");
                contactForm.reset(); // Clear the form
            } else {
                alert(result.error || "Failed to send your message. Please try again later.");
            }
        } catch (error) {
            console.error("Error submitting the form:", error);
            alert("An error occurred while sending your message. Please try again later.");
        }
    });
});

// Donate modal functions
function openDonationModal() {
    document.getElementById('donationModal').style.display = 'block';
}

function closeDonationModal() {
    document.getElementById('donationModal').style.display = 'none';
}

function initiatePayment() {
    const donorName = document.getElementById("donorName").value;
    const donorEmail = document.getElementById("donorEmail").value.trim(); // Email is optional
    const donorPhone = document.getElementById("donorPhone").value.trim(); // Phone number is optional
    const amount = document.getElementById("amount").value * 100;
    const country = document.getElementById("country").value;
    const state = document.getElementById("state").value;

    // Ensure required fields are filled
    if (!donorName || !amount || !country || !state) {
        alert("Please fill all required fields before proceeding.");
        return;
    }

    // Use a default email if none is provided (Paystack requires an email)
    const emailToUse = donorEmail || `donor_${Date.now()}@example.com`;

    let handler = PaystackPop.setup({
        key: 'pk_live_e6942e61f70c87019cbeb64ffed04e10fbd2ee10', // Replace with your public key
        email: emailToUse,
        amount: amount,
        ref: '' + Math.floor((Math.random() * 1000000000) + 1),
        onClose: function() {
            alert('Transaction window closed.');
        },
        callback: function(response) {
            // Send data to the backend
            fetch("/donate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    donorName,
                    donorEmail, // Can be empty
                    donorPhone, // Can be empty
                    amount: amount / 100, // Convert back to NGN
                    country,
                    state,
                    reference: response.reference
                })
            }).then(res => res.json()).then(data => {
                alert(data.message);
            }).catch(error => {
                console.error("Error:", error);
                alert("Something went wrong. Please try again.");
            });
        }
    });

    handler.openIframe();
}
// Back to top button functionality
window.onscroll = function () {
        scrollFunction();
    };

function scrollFunction() {
    if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
        document.getElementById("myBtn").style.display = "block";
    } else {
        document.getElementById("myBtn").style.display = "none";
    }
}

function topFunction() {
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
}

document.getElementById("logoutBtn").addEventListener("click", async function() {
    const response = await fetch("/adminLogout", { method: "POST" });
    if (response.ok) {
        window.location.href = "/admin_login.html" //logout for dashboard
    }
});

document.getElementById("fetchReport").addEventListener("click", async function() {
    const startDate = document.getElementById("startDate").value;
    const endDate = document.getElementById("endDate").value;
    
    const response = await fetch(`/fetch-donations?start=${startDate}&end=${endDate}`);
    const data = await response.json();
    
    let tableRows = "";
    data.forEach(donation => {
        tableRows += `<tr>
            <td>${donation.donor_name}</td>
            <td>${donation.date_time}</td>
            <td>${donation.amount}</td>
        </tr>`;
    });
    document.getElementById("reportTable").innerHTML = tableRows;
});

document.getElementById("downloadReport").addEventListener("click", async function() {
    const startDate = document.getElementById("startDate").value;
    const endDate = document.getElementById("endDate").value;

    const response = await fetch(`/fetch-donations?start=${startDate}&end=${endDate}&download=true`);
    
    if (!response.ok) {
        alert("Error generating the report!");
        return;
    }

    // Create a link to trigger the download of the CSV file
    const blob = await response.blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "donations-report.pdf";
    link.click();
});

 // Handling form submission
 document.getElementById('admin-login-form').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent the default form submission

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    // Clear previous error message
    document.getElementById('login-error').style.display = 'none';

    // Perform AJAX login request using fetch API
    fetch('/admin_login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: username,
        password: password
      })
    })
    .then(response => {
      if (response.status === 200) {
        // Successful login, redirect to the dashboard
        window.location.href = '/monitor'; // Change to your admin dashboard route
      } else {
        // Show error message if credentials are incorrect
        document.getElementById('login-error').style.display = 'block';
      }
    })
    .catch(err => {
      console.error('Error:', err);
      // Handle any potential errors
      document.getElementById('login-error').innerText = 'An error occurred, please try again later.';
      document.getElementById('login-error').style.display = 'block';
    });
  });
