describe('Employee', () => {
  beforeEach(() => {
    cy.visit('/employees/manage-employees');
  });

  it('should filter by employee status Active', () => {
    cy.selectDropdown('selectStatus', 'Active');

    cy.wait(5000);
  });

  it('should filter by employee status Inactive', () => {
    cy.selectDropdown('selectStatus', 'Inactive');
  });
});
