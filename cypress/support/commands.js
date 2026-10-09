/// <reference types="cypress" />
import 'cypress-file-upload';

Cypress.Commands.add('getBySel', (selector, ...args) => {
  return cy.get(`[data-test=${selector}]`, ...args);
});

Cypress.Commands.add('getBySelLike', (selector, ...args) => {
  return cy.get(`[data-test*=${selector}]`, ...args);
});

// Define a custom command to scroll and select an option using the ID
Cypress.Commands.add('scrollToSelect', (dropdownId, optionText) => {
  cy.get(`#${dropdownId}`).then(($dropdown) => {
    const scrollableDiv = $dropdown[0];
    const scrollHeight = scrollableDiv.scrollHeight;
    const clientHeight = scrollableDiv.clientHeight;

    let currentPosition = 0;
    const step = 10;

    function scroll() {
      if (currentPosition + clientHeight < scrollHeight) {
        cy.wrap(scrollableDiv).scrollTo(0, currentPosition);
        currentPosition += step;
        setTimeout(scroll, 50);
      }
    }

    scroll();

    cy.wrap(scrollableDiv).contains(optionText).click();
  });
});

Cypress.Commands.add('selectDropdown', (testId, optionText) => {
  // Open the dropdown by clicking on the element with the given test ID
  cy.get(`[id="${testId}"]`).click({ force: true });

  // Select the option with the given text from the dropdown
  cy.get('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')
    .find('.ant-select-item-option')
    .each(($el) => {
      if ($el.text().trim() === optionText) {
        cy.wrap($el).click({ force: true });
      }
    });
});

Cypress.Commands.add('selectTime', (id, hour, minute, period) => {
  cy.get(`#${id}`)
    .click()
    .then(() => {
      // Ensure we're working within the opened time picker context
      cy.get('.ant-picker-dropdown')
        .last()
        .within(() => {
          cy.get(
            '.ant-picker-time-panel-column[data-type="hour"] .ant-picker-time-panel-cell-inner',
          )
            .contains(hour)
            .click({ force: true, multiple: true });

          cy.get(
            '.ant-picker-time-panel-column[data-type="minute"] .ant-picker-time-panel-cell-inner',
          )
            .contains(minute)
            .click({ force: true, multiple: true });

          cy.get(
            '.ant-picker-time-panel-column[data-type="meridiem"] .ant-picker-time-panel-cell-inner',
          )
            .contains(period)
            .click({ force: true, multiple: true });

          cy.get('.ant-picker-ok button').click();
        });
    });
});

Cypress.Commands.add('selectBranch', (branchName) => {
  cy.get('#branchId').click(); // Click the dropdown to open it
  cy.wait(500); // Wait for the dropdown items to render
  cy.get('.ant-select-item-option-content') // Update the selector if needed
    .contains(branchName)
    .click(); // Select the branch by its text
});
