describe('Employee', () => {
  beforeEach(() => {
    cy.visit('/employees/manage-employees');
  });

  it('should search for a particular employee', () => {
    // Replace with the actual search term you want to use
    const searchTerm = 'John';

    // Find the search box and type the search term
    cy.get('input[placeholder="Search employee"]').type(searchTerm);

    // Verify that the client appears in the search results
    cy.get('table').contains('td', searchTerm).should('be.visible');
  });
});
