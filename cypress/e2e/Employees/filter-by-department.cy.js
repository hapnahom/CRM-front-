describe('Employee', () => {
  beforeEach(() => {
    cy.visit('/employees/manage-employees');
  });

  it('should filter by Department type Sub Department 1', () => {
    // Select 'Premium' from the subscription type dropdown
    // cy.get('select[placeholder="subscriptionTypeFilter"]').select('Premium');
    cy.selectDropdown('selectDepartment', 'Sub Department 1');

    // Verify that the clients with 'Premium' subscription type are displayed
    // cy.get('table').contains('td', 'Premium').should('be.visible');
    cy.get('table').contains('td', 'Sub Department 1').should('be.visible');
  });
});
