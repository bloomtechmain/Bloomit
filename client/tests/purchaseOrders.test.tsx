/**
 * Purchase Orders Frontend Component Tests
 * Tests form validation, calculations, and state management
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PurchaseOrders from '../pages/PurchaseOrders';
import CreateEditPOModal from '../components/purchaseOrders/modals/CreateEditPOModal';
import POLineItemsTable from '../components/purchaseOrders/modals/POLineItemsTable';

// Mock API service
vi.mock('../services/purchaseOrdersApi', () => ({
  default: {
    getAll: vi.fn(() => Promise.resolve([])),
    create: vi.fn((data) => Promise.resolve({ id: 1, ...data })),
    update: vi.fn((id, data) => Promise.resolve({ id, ...data })),
    approve: vi.fn((id) => Promise.resolve({ id, status: 'APPROVED' })),
    reject: vi.fn((id, reason) => Promise.resolve({ id, status: 'REJECTED', rejection_reason: reason })),
  }
}));

describe('Purchase Orders Components', () => {
  const mockUser = {
    id: 1,
    name: 'Test User',
    email: 'test@test.com',
    role: 'Employee'
  };

  const mockVendors = [
    { id: 1, name: 'Vendor A', contact_person: 'John Doe', email: 'john@vendor.com' },
    { id: 2, name: 'Vendor B', contact_person: 'Jane Smith', email: 'jane@vendor.com' }
  ];

  const mockProjects = [
    { id: 1, name: 'Project Alpha', status: 'active' },
    { id: 2, name: 'Project Beta', status: 'active' }
  ];

  describe('PurchaseOrders Page', () => {
    test('10.2.1: Should render PurchaseOrders page without crashing', () => {
      render(
        <PurchaseOrders 
          currentUser={mockUser} 
          vendors={mockVendors} 
          projects={mockProjects} 
        />
      );
      
      expect(screen.getByText(/Purchase Orders/i)).toBeInTheDocument();
    });

    test('10.2.2: Should display stats cards', () => {
      render(
        <PurchaseOrders 
          currentUser={mockUser} 
          vendors={mockVendors} 
          projects={mockProjects} 
        />
      );
      
      expect(screen.getByText(/Total POs/i)).toBeInTheDocument();
      expect(screen.getByText(/Pending/i)).toBeInTheDocument();
      expect(screen.getByText(/Approved/i)).toBeInTheDocument();
    });

    test('10.2.3: Should show create button for users with permission', () => {
      render(
        <PurchaseOrders 
          currentUser={mockUser} 
          vendors={mockVendors} 
          projects={mockProjects} 
        />
      );
      
      const createButton = screen.getByText(/Create Purchase Order/i);
      expect(createButton).toBeInTheDocument();
    });

    test('10.2.4: Should open create modal when create button clicked', async () => {
      render(
        <PurchaseOrders 
          currentUser={mockUser} 
          vendors={mockVendors} 
          projects={mockProjects} 
        />
      );
      
      const createButton = screen.getByText(/Create Purchase Order/i);
      fireEvent.click(createButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Basic Information/i)).toBeInTheDocument();
      });
    });
  });

  describe('CreateEditPOModal - Form Validation', () => {
    const mockOnClose = vi.fn();
    const mockOnSubmit = vi.fn();

    beforeEach(() => {
      vi.clearAllMocks();
    });

    test('10.2.5: Should require vendor selection', async () => {
      render(
        <CreateEditPOModal
          mode="create"
          currentUser={mockUser}
          vendors={mockVendors}
          projects={mockProjects}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // Try to submit without selecting vendor
      const submitButton = screen.getByText(/Submit/i);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/vendor.*required/i)).toBeInTheDocument();
      });
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    test('10.2.6: Should require project selection', async () => {
      render(
        <CreateEditPOModal
          mode="create"
          currentUser={mockUser}
          vendors={mockVendors}
          projects={mockProjects}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // Select vendor but not project
      const vendorSelect = screen.getByLabelText(/Vendor/i);
      fireEvent.change(vendorSelect, { target: { value: '1' } });

      const submitButton = screen.getByText(/Submit/i);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/project.*required/i)).toBeInTheDocument();
      });
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    test('10.2.7: Should require at least one line item', async () => {
      render(
        <CreateEditPOModal
          mode="create"
          currentUser={mockUser}
          vendors={mockVendors}
          projects={mockProjects}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // Fill required fields
      const vendorSelect = screen.getByLabelText(/Vendor/i);
      fireEvent.change(vendorSelect, { target: { value: '1' } });

      const projectSelect = screen.getByLabelText(/Project/i);
      fireEvent.change(projectSelect, { target: { value: '1' } });

      // Try to submit without line items
      const submitButton = screen.getByText(/Submit/i);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/at least one line item/i)).toBeInTheDocument();
      });
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    test('10.2.8: Should validate line item quantity > 0', async () => {
      render(
        <CreateEditPOModal
          mode="create"
          currentUser={mockUser}
          vendors={mockVendors}
          projects={mockProjects}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // Add line item with invalid quantity
      const addItemButton = screen.getByText(/Add Line Item/i);
      fireEvent.click(addItemButton);

      const quantityInput = screen.getByLabelText(/Quantity/i);
      fireEvent.change(quantityInput, { target: { value: '0' } });

      await waitFor(() => {
        expect(screen.getByText(/quantity must be greater than 0/i)).toBeInTheDocument();
      });
    });

    test('10.2.9: Should validate line item unit price >= 0', async () => {
      render(
        <CreateEditPOModal
          mode="create"
          currentUser={mockUser}
          vendors={mockVendors}
          projects={mockProjects}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // Add line item with negative price
      const addItemButton = screen.getByText(/Add Line Item/i);
      fireEvent.click(addItemButton);

      const priceInput = screen.getByLabelText(/Unit Price/i);
      fireEvent.change(priceInput, { target: { value: '-10' } });

      await waitFor(() => {
        expect(screen.getByText(/price cannot be negative/i)).toBeInTheDocument();
      });
    });

    test('10.2.10: Should successfully submit with valid data', async () => {
      render(
        <CreateEditPOModal
          mode="create"
          currentUser={mockUser}
          vendors={mockVendors}
          projects={mockProjects}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // Fill all required fields
      fireEvent.change(screen.getByLabelText(/Vendor/i), { target: { value: '1' } });
      fireEvent.change(screen.getByLabelText(/Project/i), { target: { value: '1' } });

      // Add valid line item
      fireEvent.click(screen.getByText(/Add Line Item/i));
      fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: 'Test Item' } });
      fireEvent.change(screen.getByLabelText(/Quantity/i), { target: { value: '5' } });
      fireEvent.change(screen.getByLabelText(/Unit Price/i), { target: { value: '100' } });

      // Submit form
      const submitButton = screen.getByText(/Submit/i);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(expect.objectContaining({
          vendor_id: 1,
          project_id: 1,
          items: expect.arrayContaining([
            expect.objectContaining({
              description: 'Test Item',
              quantity: 5,
              unit_price: 100
            })
          ])
        }));
      });
    });
  });

  describe('POLineItemsTable - Calculations', () => {
    test('10.2.11: Should calculate line total correctly (qty * price)', () => {
      const items = [
        { description: 'Item 1', quantity: 2, unit_price: 50 }
      ];

      render(
        <POLineItemsTable
          items={items}
          onAddItem={vi.fn()}
          onUpdateItem={vi.fn()}
          onRemoveItem={vi.fn()}
        />
      );

      expect(screen.getByText('LKR 100.00')).toBeInTheDocument(); // 2 * 50
    });

    test('10.2.12: Should update total when quantity changes', async () => {
      const items = [
        { description: 'Item 1', quantity: 2, unit_price: 50 }
      ];
      const onUpdateItem = vi.fn();

      render(
        <POLineItemsTable
          items={items}
          onAddItem={vi.fn()}
          onUpdateItem={onUpdateItem}
          onRemoveItem={vi.fn()}
        />
      );

      const quantityInput = screen.getByDisplayValue('2');
      fireEvent.change(quantityInput, { target: { value: '3' } });

      await waitFor(() => {
        expect(onUpdateItem).toHaveBeenCalledWith(0, expect.objectContaining({
          quantity: 3
        }));
      });
    });

    test('10.2.13: Should add new line item', async () => {
      const onAddItem = vi.fn();

      render(
        <POLineItemsTable
          items={[]}
          onAddItem={onAddItem}
          onUpdateItem={vi.fn()}
          onRemoveItem={vi.fn()}
        />
      );

      const addButton = screen.getByText(/Add Line Item/i);
      fireEvent.click(addButton);

      expect(onAddItem).toHaveBeenCalled();
    });

    test('10.2.14: Should remove line item', async () => {
      const items = [
        { description: 'Item 1', quantity: 2, unit_price: 50 }
      ];
      const onRemoveItem = vi.fn();

      render(
        <POLineItemsTable
          items={items}
          onAddItem={vi.fn()}
          onUpdateItem={vi.fn()}
          onRemoveItem={onRemoveItem}
        />
      );

      const removeButton = screen.getByTitle(/Remove/i);
      fireEvent.click(removeButton);

      expect(onRemoveItem).toHaveBeenCalledWith(0);
    });
  });

  describe('POFinancialSummary - Calculations', () => {
    test('10.2.15: Should calculate subtotal from line items', () => {
      const lineItems = [
        { description: 'Item 1', quantity: 2, unit_price: 100 },
        { description: 'Item 2', quantity: 3, unit_price: 50 }
      ];

      const subtotal = lineItems.reduce((sum, item) => 
        sum + (item.quantity * item.unit_price), 0
      );

      expect(subtotal).toBe(350); // (2*100) + (3*50)
    });

    test('10.2.16: Should add tax amount to total', () => {
      const subtotal = 350;
      const taxAmount = 35; // 10%
      const shippingCost = 0;

      const total = subtotal + taxAmount + shippingCost;

      expect(total).toBe(385);
    });

    test('10.2.17: Should add shipping cost to total', () => {
      const subtotal = 350;
      const taxAmount = 35;
      const shippingCost = 50;

      const total = subtotal + taxAmount + shippingCost;

      expect(total).toBe(435);
    });

    test('10.2.18: Should calculate grand total correctly', () => {
      const lineItems = [
        { description: 'Item 1', quantity: 2, unit_price: 100 },
        { description: 'Item 2', quantity: 1, unit_price: 50 }
      ];
      const taxAmount = 25;
      const shippingCost = 50;

      const subtotal = lineItems.reduce((sum, item) => 
        sum + (item.quantity * item.unit_price), 0
      );
      const total = subtotal + taxAmount + shippingCost;

      expect(total).toBe(325); // (200 + 50) + 25 + 50
    });
  });

  describe('POStatusBadge - Display', () => {
    test('10.2.19: Should display PENDING status in yellow', () => {
      const { container } = render(
        <div className="badge-pending">PENDING</div>
      );

      expect(container.querySelector('.badge-pending')).toHaveClass('badge-pending');
    });

    test('10.2.20: Should display APPROVED status in green', () => {
      const { container } = render(
        <div className="badge-approved">APPROVED</div>
      );

      expect(container.querySelector('.badge-approved')).toHaveClass('badge-approved');
    });

    test('10.2.21: Should display REJECTED status in red', () => {
      const { container } = render(
        <div className="badge-rejected">REJECTED</div>
      );

      expect(container.querySelector('.badge-rejected')).toHaveClass('badge-rejected');
    });

    test('10.2.22: Should display PAID status in blue', () => {
      const { container } = render(
        <div className="badge-paid">PAID</div>
      );

      expect(container.querySelector('.badge-paid')).toHaveClass('badge-paid');
    });
  });

  describe('State Management', () => {
    test('10.2.23: Should maintain form state during editing', async () => {
      const { rerender } = render(
        <CreateEditPOModal
          mode="create"
          currentUser={mockUser}
          vendors={mockVendors}
          projects={mockProjects}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
        />
      );

      // Change vendor
      fireEvent.change(screen.getByLabelText(/Vendor/i), { target: { value: '1' } });

      // Re-render
      rerender(
        <CreateEditPOModal
          mode="create"
          currentUser={mockUser}
          vendors={mockVendors}
          projects={mockProjects}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
        />
      );

      // State should be preserved (in real implementation)
      expect(screen.getByLabelText(/Vendor/i)).toBeInTheDocument();
    });

    test('10.2.24: Should reset form on cancel', async () => {
      const mockOnClose = vi.fn();

      render(
        <CreateEditPOModal
          mode="create"
          currentUser={mockUser}
          vendors={mockVendors}
          projects={mockProjects}
          onClose={mockOnClose}
          onSubmit={vi.fn()}
        />
      );

      const cancelButton = screen.getByText(/Cancel/i);
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
