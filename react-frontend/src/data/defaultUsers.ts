export interface DefaultUser {
    id: number;
    name: string;
    email: string;
    plan: string;
    registeredDate: string;
    lastLogin: string;
    status: string;
  }
  
  export const defaultUsers: DefaultUser[] = [
    { id: 1, name: "John Doe", email: "john.doe@example.com", plan: "Premium", registeredDate: "2025-03-15", lastLogin: "2025-04-07", status: "Actif" },
    { id: 2, name: "Marie Dupont", email: "marie.dupont@example.com", plan: "Standard", registeredDate: "2025-03-20", lastLogin: "2025-04-06", status: "Actif" },
    { id: 3, name: "Alice Smith", email: "alice.smith@example.com", plan: "Gratuit", registeredDate: "2025-03-25", lastLogin: "2025-04-01", status: "Inactif" },
    { id: 4, name: "Robert Martin", email: "robert.martin@example.com", plan: "Premium", registeredDate: "2025-03-28", lastLogin: "2025-04-07", status: "Actif" },
    { id: 5, name: "Claire Johnson", email: "claire.johnson@example.com", plan: "Standard", registeredDate: "2025-04-01", lastLogin: "2025-04-05", status: "Actif" },
    { id: 6, name: "Thomas Wilson", email: "thomas.wilson@example.com", plan: "Gratuit", registeredDate: "2025-04-02", lastLogin: "2025-04-03", status: "Suspendu" },
    { id: 7, name: "Emma Davis", email: "emma.davis@example.com", plan: "Premium", registeredDate: "2025-04-03", lastLogin: "2025-04-06", status: "Actif" },
    { id: 8, name: "Michel Bernard", email: "michel.bernard@example.com", plan: "Standard", registeredDate: "2025-04-04", lastLogin: "2025-04-04", status: "Actif" },
    { id: 9, name: "Sophie Martin", email: "sophie.martin@example.com", plan: "Gratuit", registeredDate: "2025-04-05", lastLogin: "2025-04-05", status: "Actif" },
    { id: 10, name: "Paul Dubois", email: "paul.dubois@example.com", plan: "Premium", registeredDate: "2025-04-06", lastLogin: "2025-04-07", status: "Actif" },
  ];
  



  export default defaultUsers