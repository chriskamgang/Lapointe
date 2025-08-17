import React from 'react';
import { Dropdown } from 'react-bootstrap';
import { 
    ThreeDotsVertical,
    Printer,
    ArrowRightCircle,
    PencilSquare,
    Trash,
    CashCoin,
    Eye
} from 'react-bootstrap-icons';

const StudentActionsDropdown = ({ 
    student, 
    onPrintCard, 
    onTransfer, 
    onEdit, 
    onDelete, 
    onViewPayments,
    onViewStudent,
    userRole 
}) => {
    return (
        <Dropdown align="end">
            <Dropdown.Toggle 
                variant="outline-secondary" 
                size="sm"
                className="btn-actions-dropdown"
                style={{ 
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: '#6c757d',
                    boxShadow: 'none'
                }}
            >
                <ThreeDotsVertical size={16} />
            </Dropdown.Toggle>

            <Dropdown.Menu className="shadow-sm">
                {/* Voir l'élève */}
                <Dropdown.Item 
                    onClick={() => onViewStudent?.(student)}
                    className="d-flex align-items-center"
                >
                    <Eye size={16} className="me-2 text-info" />
                    Voir l'élève
                </Dropdown.Item>

                <Dropdown.Divider />

                {/* Imprimer carte */}
                <Dropdown.Item 
                    onClick={() => onPrintCard?.(student)}
                    className="d-flex align-items-center"
                >
                    <Printer size={16} className="me-2 text-success" />
                    Imprimer la carte
                </Dropdown.Item>

                {/* Transférer */}
                <Dropdown.Item 
                    onClick={() => onTransfer?.(student)}
                    className="d-flex align-items-center"
                >
                    <ArrowRightCircle size={16} className="me-2 text-warning" />
                    Transférer
                </Dropdown.Item>

                <Dropdown.Divider />

                {/* Modifier */}
                <Dropdown.Item 
                    onClick={() => onEdit?.(student)}
                    className="d-flex align-items-center"
                >
                    <PencilSquare size={16} className="me-2 text-primary" />
                    Modifier
                </Dropdown.Item>

                {/* Paiements (pour les comptables/admins) */}
                {(userRole === 'admin' || userRole === 'accountant') && (
                    <Dropdown.Item 
                        onClick={() => onViewPayments?.(student)}
                        className="d-flex align-items-center"
                    >
                        <CashCoin size={16} className="me-2 text-success" />
                        Voir paiements
                    </Dropdown.Item>
                )}

                <Dropdown.Divider />

                {/* Supprimer */}
                <Dropdown.Item 
                    onClick={() => onDelete?.(student)}
                    className="d-flex align-items-center text-danger"
                >
                    <Trash size={16} className="me-2" />
                    Supprimer
                </Dropdown.Item>
            </Dropdown.Menu>
        </Dropdown>
    );
};

export default StudentActionsDropdown;