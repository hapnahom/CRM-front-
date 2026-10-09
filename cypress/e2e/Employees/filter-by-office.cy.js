describe('Employee', () => {
  beforeEach(() => {
    cy.visit('/employees/manage-employees');
  });

  it('should filter by Branch type HQ', () => {
    // Select 'Premium' from the subscription type dropdown
    // cy.get('select[placeholder="subscriptionTypeFilter"]').select('Premium');
    cy.selectDropdown('selectBranches', 'HQ');

    // Verify that the clients with 'Premium' subscription type are displayed
    // cy.get('table').contains('td', 'Premium').should('be.visible');
    cy.get('table').contains('td', 'HQ').should('be.visible');
  });
});
