// Run this code on https://www.happybadger.fi/products/varaus in the debug console or e.g. as a bookmarklet to display table availability on the floor plan.

async function getTeamAvailability(dateOfInterest) {
    const client = window.appointlyClient;
    const config = window.appointlyConfig;
    const service = client.service;
    const serviceVariant = service.variants[0]; // e

    let result = new Map();

    for (let teamMember of serviceVariant.teamMembers) { // t of a
        let teamMemberData = client.getTeamMemberData(serviceVariant, teamMember); // i

        const freeSlots = await client.getFreeSlots(
            teamMemberData.bookedSlots,
            teamMemberData.events,
            serviceVariant,
            teamMemberData,
            teamMemberData.availability,
            config.clientTimezone,
            client.getBrowserTimezone(),
            dateOfInterest,
            false, // large calendar events
            0 // service duration override
        );
        // remove unavailable slots
        const filteredSlots = freeSlots.filter(slot => slot.available);

        // Merge overlapping slots
        const mergedSlots = mergeOverlappingSlots(filteredSlots);

        result.set(teamMember.name, mergedSlots);
    }
    return result;
}

function mergeOverlappingSlots(slots) {
    if (slots.length === 0) {
      return slots;
    }
  
    // Sort slots by start time
    slots.sort((a, b) => a.bookingTimestamp - b.bookingTimestamp);
  
    const mergedSlots = [slots[0]];
    let currentSlot = mergedSlots[0];
  
    for (let i = 1; i < slots.length; i++) {
      const nextSlot = slots[i];
  
      // Check if the next slot overlaps with the current slot
      if (nextSlot.bookingTimestamp <= currentSlot.bookingTimestamp + currentSlot.bookingDuration * 60 * 1000) {
        // Merge the slots by extending the end time of the current slot
        currentSlot.end = nextSlot.end;
        currentSlot.bookingDuration = (nextSlot.bookingTimestamp + nextSlot.bookingDuration * 60 * 1000 - currentSlot.bookingTimestamp) / (60 * 1000);
      } else {
        // No overlap, add the next slot as a new merged slot
        mergedSlots.push(nextSlot);
        currentSlot = nextSlot;
      }
    }
  
    return mergedSlots;
}

// Define the positions of each table on the floor plan
const teamMemberPositions = new Map([
['Booth 1', { top: '40%', left: '13%' }],
['Booth 2', { top: '59%', left: '13%' }],
['Booth 3', { top: '75%', left: '13%' }],
['Square 1', { top: '35%', left: '20%' }],
['Square 2', { top: '38%', left: '29%' }],
['Round Table', { top: '50%', left: '22%' }],
['Square 3', { top: '35%', left: '60%' }],
['Square 4', { top: '38%', left: '67%' }],
['Mecatol Rex', { top: '53%', left: '76%' }],
]);

function displayTeamAvailability(selectedDate) {
    const productMediaDiv = document.querySelector('.product__media');

    // Remove existing availability labels before adding new ones
    productMediaDiv.querySelectorAll('.availability-text').forEach(label => {
        productMediaDiv.removeChild(label);
    });

    getTeamAvailability(selectedDate).then(teamAvailability => {
        teamAvailability.forEach((slots, teamMemberName) => {
            // Format available slots as a comma-separated string
            const formattedSlots = slots.map(slot => `${slot.start}-${slot.end}`).join(', ');

            // Add the team member and their slots to the map
            const position = teamMemberPositions.get(teamMemberName);
            if (position) {
                const slotElement = document.createElement('div');
                slotElement.textContent = formattedSlots;
                slotElement.style.position = 'absolute';
                slotElement.style.top = position.top;
                slotElement.style.left = position.left;
                // Add CSS class to the slot element
                slotElement.classList.add('availability-text');
                productMediaDiv.appendChild(slotElement);
            }
        });
    });
}

function createAndDisplayDateDropdown() {
    const productMediaDiv = document.querySelector('.product__media');
    const dateDropdown = document.createElement('select');
    dateDropdown.classList.add('date-dropdown');

    // Add each date as an option to the dropdown
    const today = new Date();
    for (let i = 0; i < 30; i++) {
        const dateOfInterest = new Date(today);
        dateOfInterest.setDate(today.getDate() + i);
        const formattedDate = dateOfInterest.toLocaleDateString('en-GB').split('/').join('-');

        const option = document.createElement('option');
        option.value = formattedDate;
        option.text = formattedDate;
        dateDropdown.appendChild(option);
    }

    // Set the default selected date to the current date
    const currentDate = new Date().toLocaleDateString('en-GB').split('/').join('-');
    dateDropdown.value = currentDate;

    // Add an event listener to update availability on date change
    dateDropdown.addEventListener('change', (event) => {
        const selectedDate = event.target.value;
        displayTeamAvailability(selectedDate);
    });

    // Insert the date dropdown *before* the product media div
    productMediaDiv.parentNode.insertBefore(dateDropdown, productMediaDiv);
}  

// Add this CSS to your stylesheet or within a <style> tag in your HTML
const style = document.createElement('style');
    style.innerHTML = `
        .availability-text {
            font-size: 11px;
            color: black;
            padding: 2px 4px;
        }
        .date-dropdown {
            position: absolute; /* Position within .product__media */
            top: 10px;          /* Adjust position as needed */
            left: 10px;
            z-index: 10;        /* Ensure it's above other elements */
        }
    `;

// load the necessary CSS
document.head.appendChild(style);

// let data = window.appointlyClient.bookingDataForAllServices[window.appointlyProduct.id]

// Call the new function to create and display the date dropdown
createAndDisplayDateDropdown();

// Initially display availability for the current date
const currentDate = new Date().toLocaleDateString('en-GB').split('/').join('-');
displayTeamAvailability(currentDate);
