describe('Termination and Clearance', () => {
  beforeEach(() => {
    // Visit the login page
    cy.visit('https://test-main.ienetworks.co/authentication/login');
    cy.get('#login-form_email').type('youremail');
    cy.get('#login-form_password').type('password');
    cy.get('button[type="Submit"]').click();
    cy.url().should('include', '/employees/manage-employees');
    cy.get('.ant-select-selector').eq(2).click();
    cy.get('.ant-select-item-option-content').contains('Inactive').click();
    cy.get('#inputEmployeeNames').type('Abebe');
    cy.wait(1000); // Wait for the search to complete
    cy.get('table tbody tr').should('have.length', 2); // Adjust based on expected results
    cy.get('table tbody tr').contains('Abebe').should('be.visible');
    cy.get('#editUserButtone1257c7a-d1ca-4ec8-bc0d-15c4e738490f').click();
  });

  it('should handle termination', () => {
    cy.get('button').contains('End Employment').click();
    cy.get('#effectiveDate').type('2021-01-01{enter}');
    cy.get('#selectTerminationType').click();
    cy.get('.ant-select-item-option-content').contains('Resignation').click();
    cy.get('#selectTerminationReason').type('Personal Reason');
    cy.get('#selectEligibleForHire').click();
    cy.get('.ant-select-item-option-content').contains('Yes').click();
    cy.get('#comment').type('Goodbye');
    cy.get('button').contains('Submit').click();
    cy.get('button').contains('End Employment').should('be.disabled');
  });

  it('should handle clearance', () => {
    cy.get('.ant-tabs-nav-operations').click();
    cy.get('.ant-tabs-dropdown-menu-item').contains('OffBoarding').click();
    cy.get('button').contains('Add Task').click();
    cy.get('#title').type('Clearance 4');
    cy.get('#approverId').click();
    cy.get('.ant-select-item-option-content').contains('Fitsum').click();
    cy.get('#description').type('Clearance');
    cy.get('button').contains('Submit').click();
    cy.get('.ant-card-body').should('contain', 'Clearance 4');
    cy.get('.ant-card-body')
      .contains('Clearance 4')
      .should('be.visible')
      .parent()
      .get('.ant-btn-dangerous')
      .should('exist')
      .eq(0)
      .click({ force: true });
    cy.get('button').contains('Delete').click();
    cy.wait(5000);
    cy.get('#offboarding-template-tasks button').click({ force: true });
    cy.get('.ant-dropdown-menu-item').contains('Add Items from Menu').click();
    cy.wait(1000);

    cy.get('label.ant-checkbox-wrapper')
      .contains('yes34')
      .parent()
      .find('input')
      .check();
    cy.get('button').contains('Add Selected Items').click();
    cy.get('#offboarding-template-tasks').should('exist');
    cy.get('#offboarding-template-tasks').contains('asdf').should('be.visible');
  });
});
