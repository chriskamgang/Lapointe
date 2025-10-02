import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Badge, Form, Alert, Modal, Spinner } from 'react-bootstrap';
import {
  CreditCard, Check2Circle, ExclamationTriangle, Gift,
  Laptop, Shift, FileEarmarkText, CheckSquare, ArrowLeft,
  Calendar, CashCoin, Check, Printer, Receipt, Reply, Trash
} from 'react-bootstrap-icons';
import { useParams, useNavigate } from 'react-router-dom';
import { secureApiEndpoints } from '../../utils/apiMigration';
import { useSchool } from '../../contexts/SchoolContext';
import RameStatusToggle from '../../components/RameStatusToggle';
import Swal from 'sweetalert2';

const StudentPayment = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { schoolSettings, formatCurrency, getLogoUrl } = useSchool();

  const [student, setStudent] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState([]);
  const [equipmentStatus, setEquipmentStatus] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [schoolYear, setSchoolYear] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [initialPaymentData, setInitialPaymentData] = useState(null);
  const [selectedOptional, setSelectedOptional] = useState([]);

  // États pour les totaux
  const [totals, setTotals] = useState({
    required: 0,
    paid: 0,
    remaining: 0,
    scholarship_amount: 0,
    has_scholarships: false,
    global_discount_amount: 0,
    has_global_discounts: false
  });

  // États pour les réductions
  const [discountInfo, setDiscountInfo] = useState({
    eligible_for_scholarship: false,
    scholarship_amount: 0,
    eligible_for_reduction: false,
    reduction_percentage: 0,
    deadline: null,
    reasons: []
  });

  // États pour les modals
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  const [receiptHtml, setReceiptHtml] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState(null);

  // États pour le formulaire de paiement
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_method: 'cash',
    reference_number: '',
    notes: '',
    payment_date: new Date().toISOString().split('T')[0],
    versement_date: new Date().toISOString().split('T')[0],
    apply_discount: false
  });

  // États pour les équipements
  const [equipmentActions, setEquipmentActions] = useState({
    polo_remis: false,
    blouse_remise: false,
    laptop_remis: false,
    rames_physiques: false
  });

  // États pour la gestion de la réduction dans le modal
  const [modalDiscountInfo, setModalDiscountInfo] = useState(null);
  const [isCheckingDiscount, setIsCheckingDiscount] = useState(false);

  useEffect(() => {
    if (studentId) {
      loadStudentData();
    }
  }, [studentId]);

  useEffect(() => {
    if (!initialPaymentData) return;

    let newRequired = 0;
    initialPaymentData.payment_status.forEach(status => {
      if (!status.is_optional || selectedOptional.includes(status.tranche_id)) {
        newRequired += status.required_amount;
      }
    });

    const newTotals = {
      ...totals,
      required: newRequired,
      remaining: Math.max(0, newRequired - initialPaymentData.total_paid),
    };
    setTotals(newTotals);

  }, [selectedOptional, initialPaymentData]);

  const handleOptionalTrancheToggle = (trancheId) => {
    setSelectedOptional(prev => {
      if (prev.includes(trancheId)) {
        return prev.filter(id => id !== trancheId);
      } else {
        return [...prev, trancheId];
      }
    });
  };

  const loadStudentData = async () => {
    setLoading(true);
    try {
      // Charger toutes les données en parallèle
      const [studentResponse, paymentResponse, equipmentResponse, historyResponse] = await Promise.all([
        secureApiEndpoints.students.getById(studentId),
        secureApiEndpoints.payments.getStudentInfo(studentId),
        secureApiEndpoints.equipment.getStudentStatus(studentId),
        secureApiEndpoints.payments.getStudentPaymentHistory(studentId) // Fetch history here
      ]);

      if (studentResponse.success) setStudent(studentResponse.data);

      if (paymentResponse.success) {
        setInitialPaymentData(paymentResponse.data);
        setStudent(paymentResponse.data.student);
        setPaymentStatus(paymentResponse.data.payment_status);
        setSchoolYear(paymentResponse.data.school_year);

        const initiallySelected = paymentResponse.data.payment_status
            .filter(s => s.is_optional && s.paid_amount > 0)
            .map(s => s.tranche_id);
        setSelectedOptional(initiallySelected);

        // Calculer les totaux avec réductions globales
        let totalGlobalDiscountAmount = 0;
        let hasGlobalDiscounts = false;

        if (paymentResponse.data.payment_status && Array.isArray(paymentResponse.data.payment_status)) {
          paymentResponse.data.payment_status.forEach((status) => {
            if (status.has_global_discount && status.global_discount_amount > 0) {
              totalGlobalDiscountAmount += parseFloat(status.global_discount_amount);
              hasGlobalDiscounts = true;
            }
          });
        }

        const currentTotals = {
          required: paymentResponse.data.total_required,
          paid: paymentResponse.data.total_paid,
          remaining: paymentResponse.data.total_remaining,
          scholarship_amount: paymentResponse.data.total_scholarship_amount || 0,
          has_scholarships: paymentResponse.data.has_scholarships || false,
          global_discount_amount: totalGlobalDiscountAmount,
          has_global_discounts: hasGlobalDiscounts
        };
        setTotals(currentTotals);

        setDiscountInfo({
          eligible_for_scholarship: false,
          scholarship_amount: 0,
          eligible_for_reduction: false,
          reduction_percentage: 0,
          deadline: null,
          reasons: [],
          ...(paymentResponse.data.discount_info || {})
        });
      }

      if (equipmentResponse.success) setEquipmentStatus(equipmentResponse.data);
      if (historyResponse.success) setPaymentHistory(historyResponse.data); // Set history here

    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      setError('Erreur lors du chargement des données');
      // Reset states on error
      setStudent(null);
      setPaymentStatus([]);
      setEquipmentStatus([]);
      setPaymentHistory([]);
      setSchoolYear(null);
      setTotals({
        required: 0,
        paid: 0,
        remaining: 0,
        scholarship_amount: 0,
        has_scholarships: false,
        global_discount_amount: 0,
        has_global_discounts: false
      });
      setDiscountInfo({
        eligible_for_scholarship: false,
        scholarship_amount: 0,
        eligible_for_reduction: false,
        reduction_percentage: 0,
        deadline: null,
        reasons: []
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentHistory = async () => {
    try {
      const response = await secureApiEndpoints.payments.getStudentPaymentHistory(studentId);
      if (response.success) {
        setPaymentHistory(response.data);
      }
    } catch (error) {
      console.error('Erreur historique:', error);
    }
  };

  const handleCancelPayment = async (paymentId) => {
    if (window.confirm('Êtes-vous sûr de vouloir annuler ce paiement ? Cette action est irréversible.')) {
        setPaymentLoading(true);
        try {
            const response = await secureApiEndpoints.payments.cancelPayment(paymentId);
            if (response.success) {
                Swal.fire('Annulé!', 'Paiement annulé avec succès.', 'success');
                await loadStudentData();
            } else {
                Swal.fire('Erreur', response.message || 'Erreur lors de l\'annulation du paiement.', 'error');
            }
        } catch (error) {
            console.error('Erreur annulation paiement:', error);
            Swal.fire('Erreur', 'Erreur lors de l\'annulation du paiement.', 'error');
        } finally {
            setPaymentLoading(false);
        }
    }
};

const handleUndoEquipment = async (equipmentType) => {
    if (window.confirm(`Êtes-vous sûr de vouloir annuler le paiement pour "${getEquipmentLabel(equipmentType)}"?`)) {
        setPaymentLoading(true);
        try {
            const response = await secureApiEndpoints.payments.undoEquipmentPayment(studentId, equipmentType);
            if (response.success) {
                Swal.fire('Annulé!', 'Statut de l\'équipement annulé.', 'success');
                await loadStudentData();
            } else {
                Swal.fire('Erreur', response.message || 'Erreur lors de l\'annulation du statut de l\'équipement.', 'error');
            }
        } catch (error) {
            console.error('Erreur annulation équipement:', error);
            Swal.fire('Erreur', 'Erreur lors de l\'annulation du statut de l\'équipement.', 'error');
        } finally {
            setPaymentLoading(false);
        }
    }
};

const handleUndoRame = async () => {
    if (window.confirm('Êtes-vous sûr de vouloir annuler le statut "Rames apportées"?')) {
        setPaymentLoading(true);
        try {
            const response = await secureApiEndpoints.payments.undoRameBrought(studentId);
            if (response.success) {
                Swal.fire('Annulé!', 'Statut des rames annulé.', 'success');
                await loadStudentData();
            } else {
                Swal.fire('Erreur', response.message || 'Erreur lors de l\'annulation du statut des rames.', 'error');
            }
        } catch (error) {
            console.error('Erreur annulation rames:', error);
            Swal.fire('Erreur', 'Erreur lors de l\'annulation du statut des rames.', 'error');
        } finally {
            setPaymentLoading(false);
        }
    }
};

  // Fonction pour vérifier l'éligibilité aux réductions dans le modal
  const checkDiscountEligibilityInModal = async (versementDate) => {
    if (!studentId || !versementDate) {
      setModalDiscountInfo(null);
      return;
    }

    setIsCheckingDiscount(true);

    try {
      const response = await secureApiEndpoints.payments.getStudentInfoWithDiscount(studentId);

      if (response.success) {
        if (!response.data.discount_deadline) {
          setModalDiscountInfo(response.data);
          return;
        }

        const selectedDate = new Date(versementDate);
        const parseFrenchDate = (dateStr) => {
          const parts = dateStr.split('/');
          if (parts.length === 3) {
            return new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
          }
          return new Date(dateStr);
        };

        const deadline = parseFrenchDate(response.data.discount_deadline);

        if (isNaN(selectedDate.getTime()) || isNaN(deadline.getTime())) {
          setModalDiscountInfo({
            not_eligible: true,
            message: 'Erreur de format de date'
          });
          return;
        }

        if (selectedDate <= deadline) {
          setModalDiscountInfo(response.data);
        } else {
          setModalDiscountInfo({
            ...response.data,
            is_date_expired: true,
            deadline_message: `Date limite dépassée (${response.data.discount_deadline})`
          });
        }
      } else {
        setModalDiscountInfo({
          not_eligible: true,
          message: response.message,
          reasons: response.reasons || []
        });
      }
    } catch (error) {
      console.error('Erreur vérification réduction:', error);
      setModalDiscountInfo(null);
    } finally {
      setIsCheckingDiscount(false);
    }
  };

  const handleDiscountToggle = (isChecked) => {
    setPaymentForm(prev => {
      const newForm = { ...prev, apply_discount: isChecked };

      if (isChecked && modalDiscountInfo && !modalDiscountInfo.not_eligible && !modalDiscountInfo.is_date_expired) {
        newForm.amount = modalDiscountInfo.payment_amount_required.toString();
      } else {
        newForm.amount = totals.remaining.toString();
      }

      return newForm;
    });
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();

    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
      setError('Veuillez saisir un montant valide');
      return;
    }

    if (parseFloat(paymentForm.amount) > totals.remaining) {
      setError(`Le montant saisi (${formatCurrency(parseInt(paymentForm.amount))}) est supérieur au montant restant`);
      return;
    }

    // Validation pour les réductions
    if (paymentForm.apply_discount && modalDiscountInfo && !modalDiscountInfo.not_eligible && !modalDiscountInfo.is_date_expired) {
      const expectedAmount = modalDiscountInfo.payment_amount_required;
      const paymentAmount = parseFloat(paymentForm.amount);

      if (Math.abs(paymentAmount - expectedAmount) > 0.01) {
        Swal.fire({
          title: 'Montant incorrect pour la réduction',
          html: `Pour appliquer la réduction, le montant doit être exactement : <strong>${formatAmount(expectedAmount)}</strong>`,
          icon: 'warning'
        });
        return;
      }
    }

    try {
      setPaymentLoading(true);
      setError('');

      const paymentData = {
        student_id: parseInt(studentId),
        amount: parseFloat(paymentForm.amount),
        payment_method: paymentForm.payment_method,
        reference_number: paymentForm.reference_number || null,
        notes: paymentForm.notes || null,
        payment_date: paymentForm.payment_date,
        versement_date: paymentForm.versement_date,
        apply_global_discount: paymentForm.apply_discount,
        equipment_actions: equipmentActions,
        selected_optional_tranches: selectedOptional,
      };

      const response = await secureApiEndpoints.payments.create(paymentData);

      if (response.success) {
        setSuccess('Paiement enregistré avec succès');
        setShowPaymentModal(false);
        resetPaymentForm();
        await loadStudentData();

        // Proposer d'imprimer le reçu
        const printResult = await Swal.fire({
          title: 'Paiement enregistré !',
          text: 'Voulez-vous imprimer le reçu maintenant ?',
          icon: 'success',
          showCancelButton: true,
          confirmButtonText: 'Imprimer le reçu',
          cancelButtonText: 'Plus tard'
        });

        if (printResult.isConfirmed) {
          handlePrintReceipt(response.data.id);
        }
      } else {
        setError(response.message || 'Erreur lors de l\'enregistrement du paiement');
      }
    } catch (error) {
      setError('Erreur lors de l\'enregistrement du paiement');
      console.error('Error creating payment:', error);
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleEquipmentAction = async (equipmentType, action) => {
    try {
      const requestData = {
        student_id: parseInt(studentId),
        equipment_type: equipmentType,
        action: action,
        notes: `${action} via interface de paiement`
      };

      console.log('Sending equipment action:', requestData);

      const response = await secureApiEndpoints.equipment.processAction(requestData);

      if (response.success) {
        Swal.fire({
          title: 'Succès',
          text: `${getEquipmentLabel(equipmentType)} marqué comme ${action}`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });

        // Force reload of all student data
        await loadStudentData();
      } else {
        console.error('Equipment action failed:', response);
        Swal.fire('Erreur', response.message || 'Erreur lors de l\'action', 'error');
      }
    } catch (error) {
      console.error('Erreur action équipement:', error);
      Swal.fire('Erreur', 'Erreur lors de l\'action sur l\'équipement', 'error');
    }
  };

  const handleRamesPhysiques = async () => {
    const result = await Swal.fire({
      title: 'Payer la Rames de papier physiquement', html: `            <p>Confirmez-vous que l'étudiant <strong>${student?.first_name} ${student?.last_name}</strong> a apporté sa Rames de papier physiquement ?</p>            <div class=\"mt-3\">                <label for=\"rameNotes\" class=\"form-label\">Notes (optionnel):</label>                <textarea id=\"rameNotes\" class=\"form-control\" placeholder=\"Commentaires sur le paiement Rames de papier...\"></textarea>            </div>        `, icon: 'question', showCancelButton: true, confirmButtonText: 'Oui, marquer comme payé', cancelButtonText: 'Annuler', confirmButtonColor: '#28a745',
      preConfirm: () => {
        const notes = document.getElementById('rameNotes').value;
        return { notes };
      }
    });
    if (result.isConfirmed) {
      try {
        setPaymentLoading(true);
        // Utiliser le même système que les autres équipements        
        await handleEquipmentAction('rame', 'mark_physical_rames');
        Swal.fire({ title: 'Succès !', text: 'Rames de papier marquée comme payée physiquement', icon: 'success', timer: 2000, showConfirmButton: false });
        await loadStudentData();
      } catch (error) {
        console.error('Error paying Rames de papier:', error);
        Swal.fire('Erreur', error.message || 'Erreur lors du paiement Rames de papier', 'error');
      } finally {
        setPaymentLoading(false);
      }
    }
  };

  const handleQuickPayment = async () => {
    // Le backend a déjà calculé le reste à payer avec la bourse déduite
    const effectiveRemaining = totals.remaining;
    let quickDiscountInfo = null;
    let amountWithDiscount = effectiveRemaining;

    try {
      const discountResponse = await secureApiEndpoints.payments.getStudentInfoWithDiscount(studentId);

      if (discountResponse.success && discountResponse.data.discount_deadline && !totals.has_scholarships) {
        const deadlineDate = new Date(discountResponse.data.discount_deadline);
        const versementDate = new Date();

        if (versementDate <= deadlineDate) {
          const totalRequired = discountResponse.data.total_required;
          const totalPaid = discountResponse.data.total_paid;
          const discountPercentage = discountResponse.data.discount_percentage;
          const discountAmount = (totalRequired - totalPaid) * (discountPercentage / 100);

          quickDiscountInfo = {
            discount_percentage: discountPercentage,
            discount_amount: discountAmount,
            deadline: discountResponse.data.discount_deadline
          };

          amountWithDiscount = totalRequired - totalPaid - discountAmount;
        }
      }
    } catch (error) {
      console.log('Erreur vérification réduction paiement rapide:', error);
    }

    const result = await Swal.fire({
      title: 'Paiement Rapide',
      html: `
                <div class="text-start">
                    <p><strong>Étudiant:</strong> ${student?.first_name} ${student?.last_name}</p>
                    <p><strong>Montant restant à payer:</strong> ${formatAmount(totals.remaining)}</p>
                    ${totals.has_scholarships ? `
                        <div class="alert alert-success mb-3">
                            <strong>🎉 Bourse de ${formatAmount(totals.scholarship_amount)} déjà déduite</strong><br>
                            Le montant ci-dessus inclut déjà votre bourse.
                        </div>
                    ` : quickDiscountInfo ? `
                        <div class="alert alert-info mb-3">
                            <strong>💰 Réduction disponible (${quickDiscountInfo.discount_percentage}%):</strong><br>
                            ${formatAmount(totals.remaining)} - ${formatAmount(quickDiscountInfo.discount_amount)} = 
                            <strong>${formatAmount(amountWithDiscount)}</strong>
                        </div>
                    ` : ''}
                    <div class="mb-3">
                        <label for="quickAmount" class="form-label">Montant à payer *</label>
                        <input type="number" id="quickAmount" class="form-control" 
                               value="${quickDiscountInfo ? amountWithDiscount : totals.remaining}" 
                               min="1" max="${totals.remaining}">
                    </div>
                    ${quickDiscountInfo ? `
                        <div class="mb-3">
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" id="quickApplyDiscount" checked>
                                <label class="form-check-label" for="quickApplyDiscount">
                                    Appliquer la réduction de ${quickDiscountInfo.discount_percentage}%
                                </label>
                            </div>
                        </div>
                    ` : ''}
                    <div class="mb-3">
                        <label for="quickMethod" class="form-label">Méthode de paiement *</label>
                        <select id="quickMethod" class="form-select">
                            <option value="cash">Banque</option>
                            <option value="card">Espèces</option>
                            <option value="transfer">Virement</option>
                            <option value="check">Chèque</option>
                        </select>
                    </div>
                </div>
            `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: '💳 Enregistrer le Paiement',
      cancelButtonText: 'Annuler',
      width: '500px',
      preConfirm: () => {
        const amount = parseFloat(document.getElementById('quickAmount').value);
        const method = document.getElementById('quickMethod').value;
        const applyDiscount = document.getElementById('quickApplyDiscount')?.checked || false;

        if (!amount || amount <= 0) {
          Swal.showValidationMessage('Veuillez saisir un montant valide');
          return false;
        }

        return {
          amount: amount,
          payment_method: method,
          apply_global_discount: applyDiscount,
          payment_date: new Date().toISOString().split('T')[0],
          versement_date: new Date().toISOString().split('T')[0]
        };
      }
    });

    if (result.isConfirmed) {
      try {
        setPaymentLoading(true);
        const response = await secureApiEndpoints.payments.create({
          student_id: parseInt(studentId),
          ...result.value
        });

        if (response.success) {
          Swal.fire({
            title: 'Paiement Enregistré !',
            text: `Paiement de ${formatAmount(result.value.amount)} enregistré avec succès`,
            icon: 'success',
            timer: 3000,
            showConfirmButton: false
          });

          await loadStudentData();
        } else {
          throw new Error(response.message || 'Erreur lors de l\'enregistrement du paiement');
        }
      } catch (error) {
        console.error('Error in quick payment:', error);
        Swal.fire('Erreur', error.message || 'Erreur lors de l\'enregistrement du paiement', 'error');
      } finally {
        setPaymentLoading(false);
      }
    }
  };

  const handlePrintReceipt = async (paymentId) => {
    try {
      const response = await secureApiEndpoints.payments.generateReceipt(paymentId);
      if (response.success) {
        setReceiptHtml(response.data.html);
        setShowReceiptModal(true);
      } else {
        setError('Erreur lors de la génération du reçu');
      }
    } catch (error) {
      setError('Erreur lors de la génération du reçu');
      console.error('Error generating receipt:', error);
    }
  };

  const printReceipt = () => {
    const printWindow = window.open('', '_blank');
    const receiptNumberMatch = receiptHtml.match(/Reçu N° :\s*([^<]+)/);
    const receiptNumber = receiptNumberMatch ? receiptNumberMatch[1].trim() : new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '_');

    printWindow.document.write(`
            <html>
                <head>
                    <title>Reçu_${receiptNumber}</title>
                    <style>
                        @page { size: A4 landscape; margin: 1cm; }
                        body { font-family: Arial, sans-serif; margin: 0; padding: 0; font-size: 9px; line-height: 1.3; }
                        @media print { body { margin: 0; -webkit-print-color-adjust: exact; } .no-print { display: none !important; } }
                    </style>
                </head>
                <body>
                    <div class="receipt-container">${receiptHtml}</div>
                    <div class="no-print" style="text-align: center; margin-top: 30px;">
                        <button onclick="window.print()">📄 Imprimer A4 Paysage</button>
                        <button onclick="window.close()">✖️ Fermer</button>
                    </div>
                </body>
            </html>
        `);
    printWindow.document.close();
  };

  const renderEquipmentSection = () => {
    return (
      <Card className="mb-4">
        <Card.Header>
          <h5 className="mb-0">État des équipements</h5>
        </Card.Header>
        <Card.Body>
          {equipmentStatus.length > 0 ? (
            <Row>
              {equipmentStatus.map((equipment, index) => (
                <Col md={6} key={index} className="mb-3">
                  <div className="border rounded p-3">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <div className="d-flex align-items-center">
                        {getEquipmentIcon(equipment.equipment_type)}
                        <span className="ms-2 fw-bold">{getEquipmentLabel(equipment.equipment_type)}</span>
                      </div>
                      {getStatusBadge(equipment.status)}
                    </div>

                    {/* Enhanced equipment actions */}
                    <div className="d-flex flex-column gap-2">
                      {/* Rames de papier special handling */}
                      {equipment.equipment_type === 'rame' && (
                        <>
                          <Button
                            variant={equipment.brought_physical ? "success" : "outline-info"}
                            size="sm"
                            onClick={handleRamesPhysiques}
                            disabled={equipment.brought_physical}
                          >
                            <CheckSquare className="me-1" />
                            {equipment.brought_physical ? 'Rames reçues' : 'Marquer rames reçues'}
                          </Button>
                          {equipment.brought_physical && (
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={handleUndoRame}
                            >
                              <Reply className="me-1" /> Annuler réception rames
                            </Button>
                          )}
                        </>
                      )}

                      {/* Other equipment handling */}
                      {equipment.equipment_type !== 'rame' && (
                        <div className="d-flex gap-2">
                          {/* Mark as paid button */}
                          {!equipment.has_paid_for && (
                            <Button
                              variant="outline-warning"
                              size="sm"
                              onClick={() => handleEquipmentAction(equipment.equipment_type, 'mark_as_paid')}
                            >
                              <CashCoin className="me-1" />
                              Marquer comme payé
                            </Button>
                          )}

                          {/* Mark as received button */}
                          {equipment.has_paid_for && !equipment.has_received && (
                            <Button
                              variant="outline-success"
                              size="sm"
                              onClick={() => handleEquipmentAction(equipment.equipment_type, 'mark_as_received')}
                            >
                              <Check2Circle className="me-1" />
                              Marquer comme remis
                            </Button>
                          )}

                          {/* Reset button for completed items */}
                          {equipment.has_received && (
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              onClick={() => handleEquipmentAction(equipment.equipment_type, 'reset')}
                            >
                              <ArrowLeft className="me-1" />
                              Réinitialiser
                            </Button>
                          )}
                          {equipment.has_paid_for && (
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleUndoEquipment(equipment.equipment_type)}
                            >
                              <Reply className="me-1" /> Annuler paiement
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Equipment info */}
                    <div className="mt-2 small text-muted">
                      <div>Payé: {equipment.has_paid_for ? '✅' : '❌'}</div>
                      <div>Remis: {equipment.has_received ? '✅' : '❌'}</div>
                    </div>

                    {equipment.notes && (
                      <small className="text-muted d-block mt-2">{equipment.notes}</small>
                    )}
                  </div>
                </Col>
              ))}
            </Row>
          ) : (
            <Alert variant="info">Aucun équipement requis pour cette spécialité</Alert>
          )}
        </Card.Body>
      </Card>
    );
  };

  // Enhanced scholarship application in payment calculations
  const calculateAmountWithBourse = (baseAmount, scholarshipAmount) => {
    const result = Math.max(0, parseFloat(baseAmount) - parseFloat(scholarshipAmount || 0));
    console.log('Calcul bourse:', { baseAmount, scholarshipAmount, result });
    return result;
  };

  // Improved quick payment with better bourse handling
  const handleQuickPaymentWithBourse = async () => {
    // Le backend a déjà calculé le reste à payer avec la bourse déduite
    const baseAmount = totals.remaining;
    const scholarshipAmount = totals.scholarship_amount || 0;
    const finalAmount = totals.remaining;

    // Check for additional discounts (seulement si pas de bourse)
    let quickDiscountInfo = null;
    let amountWithDiscount = finalAmount;

    // Les réductions globales ne s'appliquent QUE si l'étudiant n'a PAS de bourse
    if (!totals.has_scholarships) {
      try {
        const discountResponse = await secureApiEndpoints.payments.getStudentInfoWithDiscount(studentId);

        if (discountResponse.success && discountResponse.data.discount_deadline) {
          const deadlineDate = new Date(discountResponse.data.discount_deadline.split('/').reverse().join('-'));
          const versementDate = new Date();

          if (versementDate <= deadlineDate) {
            const discountPercentage = discountResponse.data.discount_percentage;
            const discountAmount = finalAmount * (discountPercentage / 100);

            quickDiscountInfo = {
              discount_percentage: discountPercentage,
              discount_amount: discountAmount,
              deadline: discountResponse.data.discount_deadline
            };

            amountWithDiscount = finalAmount - discountAmount;
          }
        }
      } catch (error) {
        console.log('Erreur vérification réduction paiement rapide:', error);
      }
    }

    const result = await Swal.fire({
      title: 'Paiement Rapide avec Bourse',
      html: `
            <div class="text-start">
                <p><strong>Étudiant:</strong> ${student?.first_name} ${student?.last_name}</p>
                
                <div class="card mb-3">
                    <div class="card-body">
                        <h6 class="card-title">💰 Calcul détaillé du montant à payer:</h6>
                        <table class="table table-sm">
                            <tr>
                                <td>Montant total des frais:</td>
                                <td class="text-end"><strong>${formatAmount(totals.required)}</strong></td>
                            </tr>
                            <tr>
                                <td>Total déjà payé:</td>
                                <td class="text-end"><strong>-${formatAmount(totals.paid)}</strong></td>
                            </tr>
                            ${totals.scholarship_amount > 0 ? `
                            <tr class="text-success">
                                <td>🎓 Bourse de classe:</td>
                                <td class="text-end"><strong>-${formatAmount(totals.scholarship_amount)}</strong></td>
                            </tr>
                            ` : ''}
                            <tr class="border-top table-primary">
                                <td><strong>💰 Reste à payer:</strong></td>
                                <td class="text-end"><strong>${formatAmount(finalAmount)}</strong></td>
                            </tr>
                            ${quickDiscountInfo ? `
                            <tr class="text-info">
                                <td>💸 Réduction ${quickDiscountInfo.discount_percentage}%:</td>
                                <td class="text-end">-${formatAmount(quickDiscountInfo.discount_amount)}</td>
                            </tr>
                            <tr class="border-top table-info">
                                <td><strong>🎯 Montant final à payer:</strong></td>
                                <td class="text-end"><strong>${formatAmount(amountWithDiscount)}</strong></td>
                            </tr>
                            ` : ''}
                            ${!quickDiscountInfo ? `
                            <tr class="border-top">
                                <td><strong>💰 Montant à payer:</strong></td>
                                <td class="text-end"><strong>${formatAmount(finalAmount)}</strong></td>
                            </tr>
                            ` : ''}
                        </table>
                        
                        ${totals.scholarship_amount > 0 ? `
                        <div class="alert alert-success mt-2">
                            <i class="fas fa-graduation-cap me-2"></i>
                            <strong>Félicitations!</strong> Vous bénéficiez d'une bourse de classe de ${formatAmount(totals.scholarship_amount)}. 
                            Cette réduction est automatiquement appliquée dans le calcul ci-dessus.
                        </div>
                        ` : ''}
                        
                        ${quickDiscountInfo ? `
                        <div class="alert alert-info mt-2">
                            <i class="fas fa-percent me-2"></i>
                            <strong>Bonus!</strong> Réduction de ${quickDiscountInfo.discount_percentage}% disponible jusqu'au ${quickDiscountInfo.deadline}.
                        </div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="mb-3">
                    <label for="quickAmount" class="form-label">Montant à payer *</label>
                    <input type="number" id="quickAmount" class="form-control" 
                           value="${quickDiscountInfo ? amountWithDiscount : finalAmount}" 
                           min="1" max="${totals.remaining}">
                    <div class="form-text">
                        ${totals.scholarship_amount > 0 ? `✅ Bourse de ${formatAmount(totals.scholarship_amount)} déjà déduite` : ''}
                        ${quickDiscountInfo ? ` | ✅ Réduction de ${formatAmount(quickDiscountInfo.discount_amount)} disponible` : ''}
                    </div>
                </div>
                
                ${quickDiscountInfo ? `
                    <div class="mb-3">
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" id="quickApplyDiscount" checked>
                            <label class="form-check-label" for="quickApplyDiscount">
                                Appliquer la réduction de ${quickDiscountInfo.discount_percentage}%
                            </label>
                        </div>
                    </div>
                ` : ''}
                
                <div class="mb-3">
                    <label for="quickMethod" class="form-label">Méthode de paiement *</label>
                    <select id="quickMethod" class="form-select">
                        <option value="cash">Banque</option>
                        <option value="card">Espèces</option>
                        <option value="transfer">Virement</option>
                        <option value="check">Chèque</option>
                    </select>
                </div>
            </div>
        `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: '💳 Enregistrer le Paiement',
      cancelButtonText: 'Annuler',
      width: '700px',
      preConfirm: () => {
        const amount = parseFloat(document.getElementById('quickAmount').value);
        const method = document.getElementById('quickMethod').value;
        const applyDiscount = document.getElementById('quickApplyDiscount')?.checked || false;

        if (!amount || amount <= 0) {
          Swal.showValidationMessage('Veuillez saisir un montant valide');
          return false;
        }

        if (amount > finalAmount) {
          Swal.showValidationMessage(`Le montant ne peut pas dépasser ${formatAmount(finalAmount)}`);
          return false;
        }

        return {
          amount: amount,
          payment_method: method,
          apply_global_discount: applyDiscount,
          apply_scholarship: totals.scholarship_amount > 0,
          scholarship_amount: totals.scholarship_amount,
          payment_date: new Date().toISOString().split('T')[0],
          versement_date: new Date().toISOString().split('T')[0]
        };
      }
    });

    if (result.isConfirmed) {
      try {
        setPaymentLoading(true);
        const response = await secureApiEndpoints.payments.create({
          student_id: parseInt(studentId),
          ...result.value
        });

        if (response.success) {
          Swal.fire({
            title: 'Paiement Enregistré !',
            html: `
                        <div class="text-center">
                            <div class="mb-3">
                                <i class="fas fa-check-circle text-success" style="font-size: 3rem;"></i>
                            </div>
                            <p>Paiement de <strong>${formatAmount(result.value.amount)}</strong> enregistré avec succès</p>
                            ${totals.scholarship_amount > 0 ? `
                                <div class="alert alert-success">
                                    <i class="fas fa-graduation-cap me-2"></i>
                                    Bourse de ${formatAmount(totals.scholarship_amount)} appliquée automatiquement
                                </div>
                            ` : ''}
                            ${result.value.apply_global_discount ? `
                                <div class="alert alert-info">
                                    <i class="fas fa-percent me-2"></i>
                                    Réduction de ${quickDiscountInfo?.discount_percentage}% appliquée
                                </div>
                            ` : ''}
                        </div>
                    `,
            icon: 'success',
            timer: 4000,
            showConfirmButton: false
          });

          await loadStudentData();
        } else {
          throw new Error(response.message || 'Erreur lors de l\'enregistrement du paiement');
        }
      } catch (error) {
        console.error('Error in quick payment:', error);
        Swal.fire('Erreur', error.message || 'Erreur lors de l\'enregistrement du paiement', 'error');
      } finally {
        setPaymentLoading(false);
      }
    }
  };

  const resetPaymentForm = () => {
    setPaymentForm({
      amount: '',
      payment_method: 'cash',
      reference_number: '',
      notes: '',
      payment_date: new Date().toISOString().split('T')[0],
      versement_date: new Date().toISOString().split('T')[0],
      apply_discount: false
    });
    setEquipmentActions({
      polo_remis: false,
      blouse_remise: false,
      laptop_remis: false,
      rames_physiques: false
    });
    setModalDiscountInfo(null);
  };

  const handleModalClose = () => {
    setShowPaymentModal(false);
    resetPaymentForm();
  };

  const getEquipmentIcon = (type) => {
    const icons = {
      'polo': <Shift className="text-primary" />,
      'blouse': <Shift className="text-success" />,
      'laptop': <Laptop className="text-info" />,
      'rame': <FileEarmarkText className="text-warning" />
    };
    return icons[type] || <Gift />;
  };

  const getEquipmentLabel = (type) => {
    const labels = {
      'polo': 'Polo École',
      'blouse': 'Blouse Médicale',
      'laptop': 'Ordinateur Portable',
      'rame': 'Rames de Papier'
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status) => {
    if (status === 'paid_and_received') return <Badge bg="success">Payé et reçu</Badge>;
    if (status === 'paid_pending') return <Badge bg="warning">Payé - En attente</Badge>;
    if (status === 'not_paid') return <Badge bg="danger">Non payé</Badge>;
    if (status === 'physical_received') return <Badge bg="info">Rames physiques</Badge>;
    return <Badge bg="secondary">Inconnu</Badge>;
  };

  const canMarkEquipmentAsReceived = (equipment) => {
    return equipment.has_paid_for && !equipment.has_received;
  };

  const renderRemainingAmountCard = () => {
    // Le backend calcule déjà le reste à payer avec la bourse déduite
    // Donc on affiche directement totals.remaining
    const effectiveRemaining = totals.remaining;

    return (
      <Card className="text-center">
        <Card.Body>
          <h3 className={effectiveRemaining > 0 ? "text-warning" : "text-success"}>
            {formatAmount(effectiveRemaining)}
          </h3>
          <p className="text-muted mb-0">Reste à payer effectif</p>
          {totals.has_scholarships && (
            <div className="mt-2">
              <small className="text-muted d-block">
                Montant initial: {formatAmount(totals.required)}
              </small>
              <small className="text-info d-block">
                Total payé: {formatAmount(totals.paid)}
              </small>
              <small className="text-success">
                <i className="fas fa-graduation-cap me-1"></i>
                Bourse déduite: -{formatAmount(totals.scholarship_amount)}
              </small>
            </div>
          )}
        </Card.Body>
      </Card>
    );
  };

  const formatAmount = (amount) => {
    return formatCurrency(parseInt(amount));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const getPaymentMethodLabel = (method, isRamePhysical = false) => {
    if (isRamePhysical) return 'Rames de papier Physique';
    const methods = {
      cash: 'Banque',
      card: 'Espèces',
      transfer: 'Virement',
      check: 'Chèque'
    };
    return methods[method] || method;
  };

  if (loading) {
    return (
      <Container fluid className="py-4">
        <div className="text-center">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Chargement...</span>
          </Spinner>
        </div>
      </Container>
    );
  }

  if (!student) {
    return (
      <Container fluid className="py-4">
        <Alert variant="danger">Étudiant non trouvé</Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center">
              <Button variant="outline-secondary" size="sm" onClick={() => navigate(-1)} className="me-3">
                <ArrowLeft size={16} />
              </Button>
              <div>
                <h2 className="mb-1">Paiement - {student.last_name} {student.first_name}</h2>
                <p className="text-muted mb-0">
                  {student.classSeries?.schoolClass?.name} - {student.classSeries?.name} | {schoolYear?.name}
                </p>
              </div>
            </div>
            <div className="d-flex gap-2">
              {totals.remaining <= 0 ? (
                <Button variant="success" disabled>
                  <CashCoin size={16} className="me-2" />
                  Paiements Complets
                </Button>
              ) : (
                <>
                  <Button variant="success" onClick={handleQuickPaymentWithBourse}>
                    💳 Paiement Rapide
                  </Button>
                  <Button variant="primary" onClick={() => setShowPaymentModal(true)}>
                    <CashCoin size={16} className="me-2" />
                    Nouveau Paiement
                  </Button>
                </>
              )}
            </div>
          </div>
        </Col>
      </Row>

      {/* Alerts */}
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Summary Cards */}
      <Row className="mb-4">
        <Col md={4}>
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-primary">{formatAmount(totals.required)}</h3>
              <p className="text-muted mb-0">Total à payer</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-success">{formatAmount(totals.paid)}</h3>
              <p className="text-muted mb-0">Total payé</p>
              {totals.has_global_discounts && totals.global_discount_amount > 0 && (
                <small className="text-info d-block mt-1">
                  {formatAmount(totals.paid)} + {formatAmount(totals.global_discount_amount)} = {formatAmount(totals.required)}
                </small>
              )}
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          {renderRemainingAmountCard()}
        </Col>
      </Row>

      {/* Information sur la bourse */}
      {totals.has_scholarships && totals.remaining > 0 && (
        <Row className="mb-3">
          <Col>
            <Alert variant="success" className="text-center">
              <Gift className="me-2" />
              <strong>Bonne nouvelle !</strong> Vous bénéficiez d'une bourse de {formatAmount(totals.scholarship_amount)}.
              <br />
              <small>Cette réduction sera automatiquement appliquée lors du paiement.</small>
            </Alert>
          </Col>
        </Row>
      )}

      <Row>
        {/* Payment Status */}
        <Col md={7}>
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">Statut des Paiements par Tranche</h5>
            </Card.Header>
            <Card.Body>
              <Table responsive>
                <thead>
                  <tr>
                    <th>Tranche</th>
                    <th>Montant Requis</th>
                    <th>Montant Payé</th>
                    <th>Reste</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentStatus.map((status, index) => (
                    <tr key={index} className={status.is_physical_only ? 'table-info' : status.is_optional ? 'table-secondary' : ''}>
                      <td>
                        {status.is_optional ? (
                            <Form.Check
                                type="checkbox"
                                id={`tranche-${status.tranche_id}`}
                                label={status.tranche.name}
                                checked={selectedOptional.includes(status.tranche_id)}
                                onChange={() => handleOptionalTrancheToggle(status.tranche_id)}
                            />
                        ) : (
                            status.tranche.name
                        )}
                        {status.is_physical_only && (
                          <small className="text-info d-block">
                            <strong>(Paiement physique uniquement)</strong>
                          </small>
                        )}
                      </td>
                      <td>
                        {status.is_physical_only ? (
                          <span className="text-info">Physical</span>
                        ) : (
                          <>
                            {formatAmount(status.required_amount)}
                            {status.has_global_discount && status.global_discount_amount > 0 && (
                              <div className="text-success">
                                <small>
                                  Avec réduction ({status.discount_percentage}%): {formatAmount(parseFloat(status.required_amount) - parseFloat(status.global_discount_amount))}
                                </small>
                              </div>
                            )}
                          </>
                        )}
                      </td>
                      <td>
                        {status.is_physical_only ? (
                          <span className="text-info">Physical</span>
                        ) : (
                          <>
                            {formatAmount(status.paid_amount)}
                            {status.has_scholarship && status.scholarship_amount > 0 && (
                              <div className="text-success">
                                <small>+ Bourse: {formatAmount(status.scholarship_amount)}</small>
                              </div>
                            )}
                            {status.has_global_discount && status.global_discount_amount > 0 && (
                              <div className="text-success">
                                <small>+ Réduction: {formatAmount(status.global_discount_amount)} ({status.discount_percentage}%)</small>
                              </div>
                            )}
                          </>
                        )}
                      </td>
                      <td>
                        {status.is_physical_only ? (
                          <span className="text-info">Physical</span>
                        ) : (
                          formatAmount(status.remaining_amount)
                        )}
                      </td>
                      <td>
                        {status.is_physical_only ? (
                          <>
                            <Badge bg={status.rame_paid ? "success" : "warning"}>
                              {status.rame_paid ? "Payé" : "Non payé"}
                            </Badge>
                            {!status.rame_paid && (
                              <Button variant="outline-primary" size="sm" className="ms-2" onClick={handleRamesPhysiques}>
                                Payer Rames de papier
                              </Button>
                            )}
                          </>
                        ) : (
                          <Badge bg={status.is_fully_paid ? "success" : "warning"}>
                            {status.is_fully_paid ? "Complet" : "Partiel"}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>

        {/* Payment History */}
        <Col md={5}>
          {/* RameStatusToggle en haut */}
          <div className="mb-3">
            {/* État des équipements */}
            <Card className="mb-4">
              <Card.Header>
                <h5 className="mb-0">État des équipements</h5>
              </Card.Header>
              <Card.Body>
                {equipmentStatus.length > 0 ? (
                  <Row>
                    {equipmentStatus.map((equipment, index) => (
                      <Col md={6} key={index} className="mb-3">
                        <div className="border rounded p-3">
                          <div className="d-flex align-items-center justify-content-between mb-2">
                            <div className="d-flex align-items-center">
                              {getEquipmentIcon(equipment.equipment_type)}
                              <span className="ms-2 fw-bold">{getEquipmentLabel(equipment.equipment_type)}</span>
                            </div>
                            {getStatusBadge(equipment.status)}
                          </div>

                          <div className="d-flex justify-content-between align-items-center">
                            {equipment.equipment_type === 'rame' && (
                              <>
                                <Button
                                  variant="outline-info"
                                  size="sm"
                                  onClick={handleRamesPhysiques}
                                  disabled={equipment.brought_physical}
                                >
                                  <CheckSquare className="me-1" />
                                  {equipment.brought_physical ? 'Rames reçues' : 'Marquer rames reçues'}
                                </Button>
                                {equipment.brought_physical && (
                                  <Button
                                    variant="outline-danger"
                                    size="sm"
                                    onClick={handleUndoRame}
                                  >
                                    <Reply className="me-1" /> Annuler réception rames
                                  </Button>
                                )}
                              </>
                            )}

                            {equipment.equipment_type !== 'rame' && canMarkEquipmentAsReceived(equipment) && (
                              <Button
                                variant="outline-success"
                                size="sm"
                                onClick={() => handleEquipmentAction(equipment.equipment_type, 'mark_as_received')}
                              >
                                <Check2Circle className="me-1" />
                                Marquer comme remis
                              </Button>
                            )}
                            {equipment.has_paid_for && (
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => handleUndoEquipment(equipment.equipment_type)}
                              >
                                <Reply className="me-1" /> Annuler paiement
                              </Button>
                            )}
                          </div>

                          {equipment.notes && (
                            <small className="text-muted d-block mt-2">{equipment.notes}</small>
                          )}
                        </div>
                      </Col>
                    ))}
                  </Row>
                ) : (
                  <Alert variant="info">Aucun équipement requis pour cette spécialité</Alert>
                )}
              </Card.Body>
            </Card>
          </div>

          <Card>
            <Card.Header>
              <h5 className="mb-0">Historique des Paiements</h5>
            </Card.Header>
            <Card.Body>
              {paymentHistory.length === 0 ? (
                <p className="text-muted text-center">Aucun paiement enregistré</p>
              ) : (
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  <Table striped bordered hover responsive>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Reçu N°</th>
                        <th>Montant</th>
                        <th>Méthode</th>
                        <th>Notes</th>
                        <th className="text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentHistory.map(p => (
                        <tr key={p.id}>
                          <td>{new Date(p.payment_date).toLocaleDateString()}</td>
                          <td>{p.receipt_number}</td>
                          <td>{p.total_amount.toLocaleString()} FCFA</td>
                          <td>{p.payment_method}</td>
                          <td>{p.notes}</td>
                          <td className="text-center">
                            <Button variant="outline-primary" size="sm" onClick={() => handlePrintReceipt(p.id)} className="me-2">
                              <Receipt size={14} /> Imprimer
                            </Button>
                            <Button variant="danger" size="sm" onClick={() => handleCancelPayment(p.id)} disabled={paymentLoading}>
                              <Trash className="me-1" /> Annuler
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Payment Modal */}
      <Modal show={showPaymentModal} onHide={handleModalClose} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Nouveau Paiement</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handlePaymentSubmit}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Montant du versement ({schoolSettings.currency || 'FCFA'}) *</Form.Label>
                  <Form.Control
                    type="number"
                    min="1"
                    max={totals.remaining || 0}
                    step="1"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    placeholder="Ex: 25000"
                    required
                  />
                  <Form.Text className="text-muted">
                    Reste à payer: {formatAmount(totals.remaining)}
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Mode de paiement *</Form.Label>
                  <Form.Select
                    value={paymentForm.payment_method}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                    required
                  >
                    <option value="cash">Banque</option>
                    <option value="card">Espèces</option>
                    <option value="transfer">Virement</option>
                    <option value="check">Chèque</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Date de versement *</Form.Label>
                  <Form.Control
                    type="date"
                    value={paymentForm.versement_date}
                    onChange={(e) => {
                      setPaymentForm({ ...paymentForm, versement_date: e.target.value });
                      checkDiscountEligibilityInModal(e.target.value);
                    }}
                    required
                  />
                  <Form.Text className="text-muted">Date effective du versement de l'étudiant</Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Date de validation <small className="text-muted">(automatique)</small></Form.Label>
                  <Form.Control
                    type="date"
                    value={paymentForm.payment_date}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                  />
                  <Form.Text className="text-muted">Date officielle d'enregistrement dans le système.</Form.Text>
                </Form.Group>
              </Col>
            </Row>

            {/* Vérification des réductions */}
            {isCheckingDiscount && (
              <Row className="mb-3">
                <Col>
                  <div className="text-center">
                    <Spinner animation="border" size="sm" className="me-2" />
                    <small className="text-muted">Vérification des réductions disponibles...</small>
                  </div>
                </Col>
              </Row>
            )}

            {modalDiscountInfo && !modalDiscountInfo.not_eligible && !modalDiscountInfo.is_date_expired && (
              <Row className="mb-3">
                <Col>
                  <Card className="bg-success bg-opacity-10 border-success">
                    <Card.Body className="py-3">
                      <div className="d-flex align-items-center justify-content-between">
                        <div>
                          <h6 className="text-success mb-1">
                            🎉 Réduction de {modalDiscountInfo.discount_percentage}% disponible !
                          </h6>
                          <small className="text-muted">
                            Économisez {formatAmount(modalDiscountInfo.normal_totals.total_discount)}
                          </small>
                        </div>
                        <Form.Check
                          type="checkbox"
                          label="Appliquer la réduction"
                          checked={paymentForm.apply_discount}
                          onChange={(e) => handleDiscountToggle(e.target.checked)}
                          className="text-success"
                        />
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            )}

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Numéro de référence</Form.Label>
                  <Form.Control
                    type="text"
                    value={paymentForm.reference_number}
                    onChange={(e) => setPaymentForm({ ...paymentForm, reference_number: e.target.value })}
                    placeholder="Numéro chèque, virement..."
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Notes</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                placeholder="Notes additionnelles..."
              />
            </Form.Group>

            {/* Section équipements dans le modal */}
            <hr />
            <h6 className="mb-3">Actions sur les équipements</h6>
            <Row>
              {renderEquipmentSection((equipment, index) => (
                <Col md={6} key={index} className="mb-3">
                  <div className="border rounded p-2">
                    <div className="d-flex align-items-center justify-content-between">
                      <div className="d-flex align-items-center">
                        {getEquipmentIcon(equipment.equipment_type)}
                        <span className="ms-2">{getEquipmentLabel(equipment.equipment_type)}</span>
                      </div>
                      <Form.Check
                        type="checkbox"
                        checked={equipmentActions[`${equipment.equipment_type}_remis`] || false}
                        onChange={(e) => setEquipmentActions(prev => ({
                          ...prev,
                          [`${equipment.equipment_type}_remis`]: e.target.checked
                        }))}
                        disabled={equipment.has_received}
                        label={equipment.has_received ? "Déjà remis" : "Marquer comme remis"}
                      />
                    </div>
                  </div>
                </Col>
              ))}
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleModalClose}>
              Annuler
            </Button>
            <Button variant="primary" type="submit" disabled={paymentLoading}>
              {paymentLoading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Check size={16} className="me-2" />
                  Enregistrer le Paiement
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Receipt Modal */}
      <Modal show={showReceiptModal} onHide={() => setShowReceiptModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Reçu de Paiement</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div dangerouslySetInnerHTML={{ __html: receiptHtml }} />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowReceiptModal(false)}>
            Fermer
          </Button>
          <Button variant="primary" onClick={printReceipt}>
            <Printer size={16} className="me-2" />
            Imprimer
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default StudentPayment;