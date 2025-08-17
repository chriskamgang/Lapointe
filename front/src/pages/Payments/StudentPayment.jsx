import { useEffect, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Container,
  Form,
  Modal,
  Row,
  Spinner,
  Table,
} from "react-bootstrap";
import {
  ArrowLeft,
  Calendar,
  CashCoin,
  Check,
  CreditCard,
  Printer,
  Receipt,
} from "react-bootstrap-icons";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import RameStatusToggle from "../../components/RameStatusToggle";
import { useSchool } from "../../contexts/SchoolContext";
import { secureApiEndpoints } from "../../utils/apiMigration";

const StudentPayment = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { schoolSettings, formatCurrency, getLogoUrl } = useSchool();

  const [student, setStudent] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [schoolYear, setSchoolYear] = useState(null);
  const [totals, setTotals] = useState({
    required: 0,
    paid: 0,
    remaining: 0,
    scholarship_amount: 0,
    has_scholarships: false,
  });

  const [discountInfo, setDiscountInfo] = useState({
    eligible_for_scholarship: false,
    scholarship_amount: 0,
    eligible_for_reduction: false,
    reduction_percentage: 0,
    deadline: null,
    reasons: [],
  });

  // Variable supprimée - logique intégrée dans le modal

  // Variables supprimées - ancienne logique de réduction

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptHtml, setReceiptHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    payment_method: "cash",
    reference_number: "",
    notes: "",
    payment_date: new Date().toISOString().split("T")[0],
    versement_date: new Date().toISOString().split("T")[0],
    is_rame_physical: false,
    rame_choice: "none", // Par défaut: ne pas payer la RAME
    apply_discount: false, // Nouvelle option pour appliquer la réduction
  });

  // États pour la gestion de la réduction dans le modal
  const [modalDiscountInfo, setModalDiscountInfo] = useState(null);
  const [isCheckingDiscount, setIsCheckingDiscount] = useState(false);

  useEffect(() => {
    loadStudentPaymentInfo();
    loadPaymentHistory();
  }, [studentId]);

  const loadStudentPaymentInfo = async () => {
    try {
      setLoading(true);
      const response = await secureApiEndpoints.payments.getStudentInfo(
        studentId
      );

      if (response.success) {
        setStudent(response.data.student);
        setPaymentStatus(response.data.payment_status);
        setSchoolYear(response.data.school_year);

        // Calculer le total des réductions globales appliquées
        let totalGlobalDiscountAmount = 0;
        let hasGlobalDiscounts = false;

        if (
          response.data.payment_status &&
          Array.isArray(response.data.payment_status)
        ) {
          response.data.payment_status.forEach((status) => {
            if (
              status.has_global_discount &&
              status.global_discount_amount > 0
            ) {
              totalGlobalDiscountAmount += parseFloat(
                status.global_discount_amount
              );
              hasGlobalDiscounts = true;
            }
          });
        }

        // Gérer les montants (toujours normaux maintenant)
        const currentTotals = {
          required: response.data.total_required, // Montants normaux
          paid: response.data.total_paid,
          remaining: response.data.total_remaining,
          scholarship_amount: response.data.total_scholarship_amount || 0,
          has_scholarships: response.data.has_scholarships || false,
          global_discount_amount: totalGlobalDiscountAmount,
          has_global_discounts: hasGlobalDiscounts,
        };
        setTotals(currentTotals);

        // Code simplifié - plus besoin de tracking des réductions existantes

        setDiscountInfo({
          eligible_for_scholarship: false,
          scholarship_amount: 0,
          eligible_for_reduction: false,
          reduction_percentage: 0,
          deadline: null,
          reasons: [],
          ...(response.data.discount_info || {}),
        });

        // Plus besoin de vérifier l'éligibilité au chargement initial
      } else {
        setError(response.message);
      }
    } catch (error) {
      setError("Erreur lors du chargement des informations de paiement");
      console.error("Error loading payment info:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentHistory = async () => {
    try {
      const response = await secureApiEndpoints.payments.getStudentHistory(
        studentId
      );

      if (response.success) {
        setPaymentHistory(response.data);
      }
    } catch (error) {
      console.error("Error loading payment history:", error);
    }
  };

  // Réinitialiser le formulaire quand le modal se ferme
  const handleModalClose = () => {
    setShowPaymentModal(false);
    setModalDiscountInfo(null);
    setPaymentForm((prev) => ({
      ...prev,
      amount: "",
      apply_discount: false,
      versement_date: new Date().toISOString().split("T")[0],
    }));
  };

  // Fonction pour payer la RAME physiquement
  const handlePayRame = async () => {
    const result = await Swal.fire({
      title: "Payer la RAME physiquement",
      html: `
                <p>Confirmez-vous que l'étudiant <strong>${student?.first_name} ${student?.last_name}</strong> a apporté sa RAME physiquement ?</p>
                <div class="mt-3">
                    <label for="rameNotes" class="form-label">Notes (optionnel):</label>
                    <textarea id="rameNotes" class="form-control" placeholder="Commentaires sur le paiement RAME..."></textarea>
                </div>
            `,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Oui, marquer comme payé",
      cancelButtonText: "Annuler",
      confirmButtonColor: "#28a745",
      cancelButtonColor: "#6c757d",
      preConfirm: () => {
        const notes = document.getElementById("rameNotes").value;
        return { notes };
      },
    });

    if (result.isConfirmed) {
      try {
        setPaymentLoading(true);
        const response = await secureApiEndpoints.payments.payRamePhysically(
          studentId,
          {
            notes: result.value.notes || "RAME apportée physiquement",
            reference_number: "RAME-PHYS-" + new Date().getTime(),
          }
        );

        if (response.success) {
          Swal.fire({
            title: "Succès !",
            text: "RAME marquée comme payée physiquement",
            icon: "success",
            timer: 2000,
            showConfirmButton: false,
          });

          // Recharger les données
          await loadStudentPaymentInfo();
          await loadPaymentHistory();
        } else {
          throw new Error(response.message || "Erreur lors du paiement RAME");
        }
      } catch (error) {
        console.error("Error paying RAME:", error);
        Swal.fire({
          title: "Erreur",
          text: error.message || "Erreur lors du paiement RAME",
          icon: "error",
        });
      } finally {
        setPaymentLoading(false);
      }
    }
  };

  // Anciennes fonctions supprimées - logique intégrée dans le modal

  // Fonction pour paiement rapide sans modal
  const handleQuickPayment = async () => {
    // Calculer le montant avec bourse (conversion en nombres)
    const amountWithScholarship = Math.max(
      0,
      parseFloat(totals.remaining) - parseFloat(totals.scholarship_amount)
    );

    // Vérifier l'éligibilité aux réductions pour le paiement rapide
    let quickDiscountInfo = null;
    let amountWithDiscount = totals.remaining;

    try {
      // Utiliser la même logique que le modal normal
      const discountResponse =
        await secureApiEndpoints.payments.getStudentInfoWithDiscount(studentId);

      if (
        discountResponse.success &&
        discountResponse.data.discount_deadline &&
        !totals.has_scholarships
      ) {
        const deadlineDate = new Date(discountResponse.data.discount_deadline);
        const versementDate = new Date(); // Date actuelle pour paiement rapide

        if (versementDate <= deadlineDate) {
          // Calculer le montant avec réduction
          const totalRequired = discountResponse.data.total_required;
          const totalPaid = discountResponse.data.total_paid;
          const discountPercentage = discountResponse.data.discount_percentage;
          const discountAmount =
            (totalRequired - totalPaid) * (discountPercentage / 100);

          quickDiscountInfo = {
            discount_percentage: discountPercentage,
            discount_amount: discountAmount,
            deadline: discountResponse.data.discount_deadline,
            normal_totals: {
              total_required: totalRequired,
              total_paid: totalPaid,
            },
          };

          amountWithDiscount = totalRequired - totalPaid - discountAmount;
        }
      }
    } catch (error) {
      console.log(
        "Erreur lors de la vérification de l'éligibilité aux réductions pour paiement rapide:",
        error
      );
    }

    const result = await Swal.fire({
      title: "Paiement Rapide",
      html: `
                <div class="text-start">
                    <p><strong>Étudiant:</strong> ${student?.first_name} ${
        student?.last_name
      }</p>
                    <p><strong>Montant restant:</strong> ${formatAmount(
                      totals.remaining
                    )}</p>
                    ${
                      totals.has_scholarships
                        ? `
                        <div class="alert alert-success mb-3">
                            <strong>🎉 Avec votre bourse:</strong><br>
                            ${formatAmount(totals.remaining)} - ${formatAmount(
                            totals.scholarship_amount
                          )} = 
                            <strong>${formatAmount(
                              amountWithScholarship
                            )}</strong>
                        </div>
                    `
                        : quickDiscountInfo
                        ? `
                        <div class="alert alert-info mb-3">
                            <strong>💰 Réduction disponible (${
                              quickDiscountInfo.discount_percentage
                            }%):</strong><br>
                            ${formatAmount(totals.remaining)} - ${formatAmount(
                            quickDiscountInfo.discount_amount
                          )} = 
                            <strong>${formatAmount(amountWithDiscount)}</strong>
                            <br><small>Paiement intégral avant le ${new Date(
                              quickDiscountInfo.deadline
                            ).toLocaleDateString("fr-FR")}</small>
                        </div>
                    `
                        : ""
                    }
                    <hr>
                    <div class="mb-3">
                        <label for="quickAmount" class="form-label">Montant à payer *</label>
                        <input type="number" id="quickAmount" class="form-control" 
                               value="${
                                 totals.has_scholarships
                                   ? amountWithScholarship
                                   : quickDiscountInfo
                                   ? amountWithDiscount
                                   : totals.remaining
                               }" 
                               min="1" max="${totals.remaining}">
                    </div>
                    ${
                      quickDiscountInfo
                        ? `
                        <div class="mb-3">
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" id="quickApplyDiscount" checked>
                                <label class="form-check-label" for="quickApplyDiscount">
                                    Appliquer la réduction de ${quickDiscountInfo.discount_percentage}%
                                </label>
                            </div>
                        </div>
                    `
                        : ""
                    }
                    <div class="mb-3">
                        <label for="quickVersementDate" class="form-label">Date de versement *</label>
                        <input type="date" id="quickVersementDate" class="form-control" 
                               value="${
                                 new Date().toISOString().split("T")[0]
                               }" required>
                    </div>
                    <div class="mb-3">
                        <label for="quickMethod" class="form-label">Méthode de paiement *</label>
                        <select id="quickMethod" class="form-select">
                            <option value="cash">Banque</option>
                            <option value="card">Carte bancaire</option>
                            <option value="transfer">Virement</option>
                            <option value="check">Chèque</option>
                        </select>
                    </div>
                    <div class="mb-3">
                        <label for="quickReference" class="form-label">Référence (optionnel)</label>
                        <input type="text" id="quickReference" class="form-control" 
                               placeholder="Numéro de référence">
                    </div>
                    <div class="mb-3">
                        <label for="quickNotes" class="form-label">Notes (optionnel)</label>
                        <textarea id="quickNotes" class="form-control" rows="2" 
                                  placeholder="Commentaires sur le paiement"></textarea>
                    </div>
                </div>
            `,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "💳 Enregistrer le Paiement",
      cancelButtonText: "Annuler",
      confirmButtonColor: "#28a745",
      cancelButtonColor: "#6c757d",
      width: "500px",
      didOpen: () => {
        // Gestionnaire pour la checkbox de réduction
        const discountCheckbox = document.getElementById("quickApplyDiscount");
        const amountInput = document.getElementById("quickAmount");

        if (discountCheckbox && amountInput && quickDiscountInfo) {
          discountCheckbox.addEventListener("change", () => {
            if (discountCheckbox.checked) {
              amountInput.value = amountWithDiscount;
            } else {
              amountInput.value = totals.remaining;
            }
          });
        }
      },
      preConfirm: () => {
        const amount = parseFloat(document.getElementById("quickAmount").value);
        const versementDate =
          document.getElementById("quickVersementDate").value;
        const method = document.getElementById("quickMethod").value;
        const reference = document
          .getElementById("quickReference")
          .value.trim();
        const notes = document.getElementById("quickNotes").value.trim();
        const applyDiscountCheckbox =
          document.getElementById("quickApplyDiscount");
        const applyDiscount = applyDiscountCheckbox
          ? applyDiscountCheckbox.checked
          : false;

        if (!amount || amount <= 0) {
          Swal.showValidationMessage("Veuillez saisir un montant valide");
          return false;
        }

        if (amount > totals.remaining) {
          Swal.showValidationMessage(
            "Le montant ne peut pas dépasser le montant restant"
          );
          return false;
        }

        if (!versementDate) {
          Swal.showValidationMessage(
            "Veuillez sélectionner une date de versement"
          );
          return false;
        }

        return {
          amount: amount,
          payment_method: method,
          reference_number: reference || "",
          notes: notes || "",
          payment_date: new Date().toISOString().split("T")[0],
          versement_date: versementDate,
          apply_global_discount: applyDiscount,
        };
      },
    });

    if (result.isConfirmed) {
      try {
        setPaymentLoading(true);
        const response = await secureApiEndpoints.payments.create({
          student_id: parseInt(studentId),
          ...result.value,
        });

        if (response.success) {
          Swal.fire({
            title: "Paiement Enregistré !",
            text: `Paiement de ${formatAmount(
              result.value.amount
            )} enregistré avec succès`,
            icon: "success",
            timer: 3000,
            showConfirmButton: false,
          });

          // Recharger les données
          await loadStudentPaymentInfo();
          await loadPaymentHistory();
        } else {
          throw new Error(
            response.message || "Erreur lors de l'enregistrement du paiement"
          );
        }
      } catch (error) {
        console.error("Error in quick payment:", error);
        Swal.fire({
          title: "Erreur",
          text: error.message || "Erreur lors de l'enregistrement du paiement",
          icon: "error",
        });
      } finally {
        setPaymentLoading(false);
      }
    }
  };

  // Fonction supprimée - logique maintenant intégrée dans le modal principal

  // Fonction supprimée - logique intégrée dans le modal

  // Fonction pour vérifier l'éligibilité aux réductions dans le modal
  const checkDiscountEligibilityInModal = async (versementDate) => {
    if (!studentId || !versementDate) {
      setModalDiscountInfo(null);
      return;
    }

    setIsCheckingDiscount(true);

    try {
      const response =
        await secureApiEndpoints.payments.getStudentInfoWithDiscount(studentId);

      if (response.success) {
        console.log("Discount response data:", response.data);

        // Vérifier si une date limite existe
        if (!response.data.discount_deadline) {
          console.log("No discount deadline found - should be eligible");
          setModalDiscountInfo(response.data);
          return;
        }

        // Vérifier si la date de versement est dans les délais
        const selectedDate = new Date(versementDate);

        // Parser la date française DD/MM/YYYY vers le format ISO
        const parseFrenchDate = (dateStr) => {
          const parts = dateStr.split("/");
          if (parts.length === 3) {
            // Convertir DD/MM/YYYY vers YYYY-MM-DD
            return new Date(
              `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(
                2,
                "0"
              )}`
            );
          }
          return new Date(dateStr); // Fallback
        };

        const deadline = parseFrenchDate(response.data.discount_deadline);

        // Vérifier que les dates sont valides
        if (isNaN(selectedDate.getTime()) || isNaN(deadline.getTime())) {
          console.error("Invalid dates:", {
            versementDate,
            discount_deadline: response.data.discount_deadline,
            selectedDateValid: !isNaN(selectedDate.getTime()),
            deadlineValid: !isNaN(deadline.getTime()),
          });
          setModalDiscountInfo({
            not_eligible: true,
            message: "Erreur de format de date",
          });
          return;
        }

        console.log("Date comparison:", {
          selectedDate: selectedDate.toDateString(),
          deadline: deadline.toDateString(),
          versementDate: versementDate,
          discount_deadline: response.data.discount_deadline,
          isValid: selectedDate <= deadline,
        });

        if (selectedDate <= deadline) {
          setModalDiscountInfo(response.data);
        } else {
          setModalDiscountInfo({
            ...response.data,
            is_date_expired: true,
            deadline_message: `Date limite dépassée (${response.data.discount_deadline})`,
          });
        }
      } else {
        // Étudiant non éligible aux réductions
        setModalDiscountInfo({
          not_eligible: true,
          message: response.message,
          reasons: response.reasons || [],
        });
      }
    } catch (error) {
      console.error("Error checking discount eligibility in modal:", error);
      setModalDiscountInfo(null);
    } finally {
      setIsCheckingDiscount(false);
    }
  };

  // Fonction pour gérer l'activation/désactivation de la réduction dans le modal
  const handleDiscountToggle = (isChecked) => {
    setPaymentForm((prev) => {
      const newForm = { ...prev, apply_discount: isChecked };

      if (
        isChecked &&
        modalDiscountInfo &&
        !modalDiscountInfo.not_eligible &&
        !modalDiscountInfo.is_date_expired
      ) {
        // Appliquer le montant avec réduction
        newForm.amount = modalDiscountInfo.payment_amount_required.toString();
      } else {
        // Revenir au montant par défaut (reste à payer)
        newForm.amount = totals.remaining.toString();
      }

      return newForm;
    });
  };

  // Fonction pour gérer les changements de montant
  const handleAmountChange = (newAmount) => {
    setPaymentForm((prev) => ({ ...prev, amount: newAmount }));
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
      setError("Veuillez saisir un montant valide");
      return;
    }

    if (parseFloat(paymentForm.amount) > totals.remaining) {
      setError(
        `Le montant saisi (${formatCurrency(
          parseInt(paymentForm.amount)
        )}) est supérieur au montant restant (${formatCurrency(
          totals.remaining
        )}). Veuillez saisir un montant inférieur ou égal au solde restant.`
      );
      return;
    }

    // NOUVELLE VALIDATION : Vérifier la cohérence entre la case cochée et le montant
    if (
      paymentForm.apply_discount &&
      modalDiscountInfo &&
      !modalDiscountInfo.not_eligible &&
      !modalDiscountInfo.is_date_expired
    ) {
      const expectedAmount = modalDiscountInfo.payment_amount_required;
      const paymentAmount = parseFloat(paymentForm.amount);

      if (Math.abs(paymentAmount - expectedAmount) > 0.01) {
        Swal.fire({
          title: "Montant incorrect pour la réduction",
          html: `
                        <div class="text-left">
                            <p>Pour appliquer la réduction, le montant doit être exactement :</p>
                            <p><strong>${formatAmount(
                              expectedAmount
                            )}</strong></p>
                            <p>Montant actuel : <strong>${formatAmount(
                              paymentAmount
                            )}</strong></p>
                        </div>
                    `,
          icon: "warning",
        });
        return;
      }
    }

    // Validation si réduction cochée mais conditions non remplies
    if (
      paymentForm.apply_discount &&
      (!modalDiscountInfo ||
        modalDiscountInfo.not_eligible ||
        modalDiscountInfo.is_date_expired)
    ) {
      Swal.fire({
        title: "Réduction non disponible",
        text: "Les conditions pour la réduction ne sont pas remplies. Veuillez décocher l'option ou modifier la date de versement.",
        icon: "warning",
      });
      return;
    }

    try {
      setPaymentLoading(true);
      setError("");

      const paymentData = {
        student_id: parseInt(studentId),
        amount: parseFloat(paymentForm.amount),
        payment_method: paymentForm.payment_method,
        reference_number: paymentForm.reference_number || null,
        notes: paymentForm.notes || null,
        payment_date: paymentForm.payment_date,
        versement_date: paymentForm.versement_date,
        apply_global_discount: paymentForm.apply_discount, // Indiquer au backend d'appliquer la réduction
      };

      const response = await secureApiEndpoints.payments.create(paymentData);

      if (response.success) {
        setSuccess("Paiement enregistré avec succès");
        setShowPaymentModal(false);

        // Réinitialiser le formulaire
        setPaymentForm({
          amount: "",
          payment_method: "cash",
          reference_number: "",
          notes: "",
          payment_date: new Date().toISOString().split("T")[0],
          versement_date: new Date().toISOString().split("T")[0],
          is_rame_physical: false,
          rame_choice: "none",
          apply_discount: false,
        });
        setModalDiscountInfo(null);

        // Recharger les données
        await loadStudentPaymentInfo();
        await loadPaymentHistory();

        // Proposer d'imprimer le reçu
        const printResult = await Swal.fire({
          title: "Paiement enregistré !",
          text: "Voulez-vous imprimer le reçu maintenant ?",
          icon: "success",
          showCancelButton: true,
          confirmButtonText: "Imprimer le reçu",
          cancelButtonText: "Plus tard",
        });

        if (printResult.isConfirmed) {
          handlePrintReceipt(response.data.id);
        }
      } else {
        setError(
          response.message || "Erreur lors de l'enregistrement du paiement"
        );
      }
    } catch (error) {
      setError("Erreur lors de l'enregistrement du paiement");
      console.error("Error creating payment:", error);
    } finally {
      setPaymentLoading(false);
    }
  };

  const handlePrintReceipt = async (paymentId) => {
    try {
      const response = await secureApiEndpoints.payments.generateReceipt(
        paymentId
      );

      if (response.success) {
        setReceiptHtml(response.data.html);
        setShowReceiptModal(true);
      } else {
        setError("Erreur lors de la génération du reçu");
      }
    } catch (error) {
      setError("Erreur lors de la génération du reçu");
      console.error("Error generating receipt:", error);
    }
  };

  const handlePrintReceiptFromHistory = async (paymentId) => {
    await handlePrintReceipt(paymentId);
  };

  const printReceipt = () => {
    const printWindow = window.open("", "_blank");
    // Extraire le numéro de reçu depuis le HTML pour un titre unique
    const receiptNumberMatch = receiptHtml.match(/Reçu N° :\s*([^<]+)/);
    const receiptNumber = receiptNumberMatch
      ? receiptNumberMatch[1].trim()
      : new Date()
          .toISOString()
          .slice(0, 19)
          .replace(/[-:]/g, "")
          .replace("T", "_");

    printWindow.document.write(`
            <html>
                <head>
                    <title>Reçu_${receiptNumber}</title>
                    <style>
                        @page {
                            size: A4 landscape;
                            margin: 1cm;
                        }
                        
                        body { 
                            font-family: Arial, sans-serif; 
                            margin: 0; 
                            padding: 0;
                            font-size: 9px;
                            line-height: 1.3;
                        }
                        
                        @media print { 
                            body { 
                                margin: 0; 
                                -webkit-print-color-adjust: exact;
                                print-color-adjust: exact;
                            }
                            .no-print { 
                                display: none !important; 
                            }
                        }
                        
                        @media screen {
                            body {
                                background: #f0f0f0;
                                padding: 20px;
                            }
                            
                            .receipt-container {
                                background: white;
                                width: 294mm;  /* Deux reçus côte à côte (147mm x 2) */
                                height: 148mm; /* Hauteur à 148mm */
                                margin: 0 auto;
                                box-shadow: 0 0 10px rgba(0,0,0,0.1);
                            }
                        }
                    </style>
                </head>
                <body>
                    <div class="receipt-container">
                        ${receiptHtml}
                    </div>
                    <div class="no-print" style="text-align: center; margin-top: 30px; background: white; padding: 20px;">
                        <button onclick="window.print()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; margin-right: 10px;">📄 Imprimer A4 Paysage</button>
                        <button onclick="window.close()" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer;">✖️ Fermer</button>
                        <div style="margin-top: 15px; font-size: 12px; color: #666;">
                            <p>📋 <strong>Instructions :</strong></p>
                            <ul style="text-align: left; max-width: 500px; margin: 0 auto;">
                                <li>Configurez votre imprimante sur format <strong>A4 Paysage</strong></li>
                                <li>Le reçu contient 2 exemplaires côte à côte</li>
                                <li><strong>Côté gauche :</strong> Exemplaire parents</li>
                                <li><strong>Côté droit :</strong> Exemplaire collège</li>
                                <li>Découpez au milieu vertical pour séparer les exemplaires</li>
                            </ul>
                        </div>
                    </div>
                </body>
            </html>
        `);
    printWindow.document.close();
  };

  const formatAmount = (amount) => {
    return formatCurrency(parseInt(amount));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("fr-FR");
  };

  const getPaymentMethodLabel = (method, isRamePhysical = false) => {
    if (isRamePhysical) {
      return "RAME Physique";
    }
    const methods = {
      cash: "Banque",
      card: "Carte",
      transfer: "Virement",
      check: "Chèque",
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
        <Alert variant="danger">
          Étudiant non trouvé ou erreur lors du chargement des données.
        </Alert>
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
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => navigate(-1)}
                className="me-3"
              >
                <ArrowLeft size={16} />
              </Button>
              <div>
                <h2 className="mb-1">
                  Paiement - {student.last_name} {student.first_name}
                </h2>
                <p className="text-muted mb-0">
                  {student.classSeries?.schoolClass?.name} -{" "}
                  {student.classSeries?.name} | {schoolYear?.name}
                </p>
              </div>
            </div>
            {totals.remaining <= 0 ? (
              <Button variant="success" disabled>
                <CashCoin size={16} className="me-2" />
                Paiements Complets
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={() => {
                  setShowPaymentModal(true);
                  // Réinitialiser les états du modal
                  setModalDiscountInfo(null);
                  setPaymentForm((prev) => ({
                    ...prev,
                    amount: "",
                    apply_discount: false,
                    versement_date: new Date().toISOString().split("T")[0],
                  }));
                }}
              >
                <CashCoin size={16} className="me-2" />
                Nouveau Paiement
              </Button>
            )}
          </div>
        </Col>
      </Row>

      {/* Alerts */}
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess("")}>
          {success}
        </Alert>
      )}

      {/* Interface épurée - pas d'info sur les réductions au chargement initial */}

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
              {totals.has_global_discounts &&
                totals.global_discount_amount > 0 && (
                  <small className="text-info d-block mt-1">
                    {formatAmount(totals.paid)} +{" "}
                    {formatAmount(totals.global_discount_amount)} ={" "}
                    {formatAmount(totals.required)}
                  </small>
                )}
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="text-center">
            <Card.Body>
              {totals.has_scholarships ? (
                <>
                  <h3
                    className={
                      totals.remaining > 0 ? "text-warning" : "text-success"
                    }
                  >
                    {formatAmount(totals.remaining)}
                  </h3>
                  <p className="text-muted mb-0">Reste à payer</p>
                  <small className="text-success">
                    (Avec bourse de {formatAmount(totals.scholarship_amount)}{" "}
                    déjà appliquée)
                  </small>
                </>
              ) : (
                <>
                  <h3
                    className={
                      totals.remaining > 0 ? "text-warning" : "text-success"
                    }
                  >
                    {formatAmount(totals.remaining)}
                  </h3>
                  <p className="text-muted mb-0">Reste à payer</p>
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Information sur la bourse (si applicable) */}
      {totals.has_scholarships && totals.remaining > 0 && (
        <Row className="mb-3">
          <Col>
            <Alert variant="success" className="text-center">
              <i className="bi bi-award me-2"></i>
              <strong>Bonne nouvelle !</strong> Vous bénéficiez d'une bourse de{" "}
              {formatAmount(totals.scholarship_amount)}.
              <br />
              <small>
                Cette réduction sera automatiquement appliquée lors du paiement.
              </small>
            </Alert>
          </Col>
        </Row>
      )}

      <Row>
        {/* Payment Status */}
        <Col md={7}>
          <Card className="mb-4">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Statut des Paiements par Tranche</h5>
              {/* <Button 
                                variant="success" 
                                size="sm"
                                onClick={() => handleQuickPayment()}
                                disabled={totals.remaining <= 0}
                            >
                                💳 Paiement Rapide
                            </Button> */}
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
                    <tr
                      key={index}
                      className={
                        status.is_physical_only
                          ? "table-info"
                          : status.is_optional
                          ? "table-secondary"
                          : ""
                      }
                    >
                      <td>
                        {status.tranche.name}
                        {status.is_physical_only && (
                          <small className="text-info d-block">
                            <strong>(Paiement physique uniquement)</strong>
                          </small>
                        )}
                        {status.is_optional && !status.is_physical_only && (
                          <small className="text-muted d-block">
                            (Optionnelle)
                          </small>
                        )}
                      </td>
                      <td>
                        {status.is_physical_only ? (
                          <span className="text-info">Physical</span>
                        ) : (
                          <>
                            {formatAmount(status.required_amount)}
                            {status.has_global_discount &&
                              status.global_discount_amount > 0 && (
                                <div className="text-success">
                                  <small>
                                    Avec réduction ({status.discount_percentage}
                                    %):{" "}
                                    {formatAmount(
                                      parseFloat(status.required_amount) -
                                        parseFloat(
                                          status.global_discount_amount
                                        )
                                    )}
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
                            {status.has_scholarship &&
                              status.scholarship_amount > 0 && (
                                <div className="text-success">
                                  <small>
                                    + Bourse:{" "}
                                    {formatAmount(status.scholarship_amount)}
                                    <br />={" "}
                                    {formatAmount(
                                      parseFloat(status.paid_amount) +
                                        parseFloat(status.scholarship_amount)
                                    )}
                                  </small>
                                </div>
                              )}
                            {status.has_global_discount &&
                              status.global_discount_amount > 0 && (
                                <div className="text-success">
                                  <small>
                                    + Réduction:{" "}
                                    {formatAmount(
                                      status.global_discount_amount
                                    )}{" "}
                                    ({status.discount_percentage}%)
                                    <br />={" "}
                                    {formatAmount(
                                      parseFloat(status.paid_amount) +
                                        parseFloat(
                                          status.global_discount_amount
                                        )
                                    )}
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
                            {status.has_scholarship &&
                            status.scholarship_amount > 0 ? (
                              <>
                                {formatAmount(
                                  Math.max(
                                    0,
                                    parseFloat(status.remaining_amount) -
                                      parseFloat(status.scholarship_amount)
                                  )
                                )}
                                {parseFloat(status.remaining_amount) -
                                  parseFloat(status.scholarship_amount) >
                                  0 && (
                                  <div className="text-success">
                                    <small>
                                      (Avec bourse:{" "}
                                      {formatAmount(
                                        Math.max(
                                          0,
                                          parseFloat(status.remaining_amount) -
                                            parseFloat(
                                              status.scholarship_amount
                                            )
                                        )
                                      )}
                                      )
                                    </small>
                                  </div>
                                )}
                              </>
                            ) : status.has_global_discount &&
                              status.global_discount_amount > 0 ? (
                              <>
                                {formatAmount(
                                  Math.max(
                                    0,
                                    parseFloat(status.remaining_amount) -
                                      parseFloat(status.global_discount_amount)
                                  )
                                )}
                                {parseFloat(status.remaining_amount) -
                                  parseFloat(status.global_discount_amount) >
                                  0 && (
                                  <div className="text-success">
                                    <small>
                                      (Avec réduction:{" "}
                                      {formatAmount(
                                        Math.max(
                                          0,
                                          parseFloat(status.remaining_amount) -
                                            parseFloat(
                                              status.global_discount_amount
                                            )
                                        )
                                      )}
                                      )
                                    </small>
                                  </div>
                                )}
                              </>
                            ) : (
                              formatAmount(status.remaining_amount)
                            )}
                          </>
                        )}
                      </td>
                      <td>
                        {status.is_physical_only ? (
                          <>
                            <Badge
                              bg={status.rame_paid ? "success" : "warning"}
                            >
                              {status.rame_paid ? "Payé" : "Non payé"}
                            </Badge>
                            {!status.rame_paid && (
                              <Button
                                variant="outline-primary"
                                size="sm"
                                className="ms-2"
                                onClick={() => handlePayRame()}
                              >
                                Payer RAME
                              </Button>
                            )}
                          </>
                        ) : (
                          <>
                            <Badge
                              bg={status.is_fully_paid ? "success" : "warning"}
                            >
                              {status.is_fully_paid
                                ? status.has_scholarship &&
                                  status.scholarship_amount > 0
                                  ? "Complet avec bourse"
                                  : "Complet"
                                : "Partiel"}
                            </Badge>
                            {status.is_optional && !status.is_fully_paid && (
                              <small className="text-muted d-block">
                                Non obligatoire
                              </small>
                            )}
                          </>
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
          {/* Section RAME en haut de la colonne de droite */}
          <div className="mb-3">
            <RameStatusToggle
              studentId={studentId}
              studentName={
                student
                  ? `${student.first_name} ${student.last_name}`
                  : "Étudiant"
              }
              onStatusChange={(newStatus) => {
                console.log("Statut RAME mis à jour:", newStatus);
              }}
            />
          </div>

          <Card>
            <Card.Header>
              <h5 className="mb-0">Historique des Paiements</h5>
            </Card.Header>
            <Card.Body>
              {paymentHistory.length === 0 ? (
                <p className="text-muted text-center">
                  Aucun paiement enregistré
                </p>
              ) : (
                <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                  {paymentHistory.map((payment) => (
                    <div key={payment.id} className="border-bottom pb-3 mb-3">
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <strong>{formatAmount(payment.total_amount)}</strong>
                          {payment.has_scholarship && (
                            <div className="text-success mt-1">
                              <small>
                                Montant payé:{" "}
                                {formatAmount(payment.total_amount)} + Bourse
                                appliquée:{" "}
                                {formatAmount(payment.scholarship_amount)} =
                                Valeur totale:{" "}
                                {formatAmount(
                                  payment.total_amount +
                                    payment.scholarship_amount
                                )}
                              </small>
                            </div>
                          )}
                          {payment.has_reduction &&
                            payment.reduction_amount > 0 && (
                              <div className="text-info mt-1">
                                <small>
                                  Montant payé:{" "}
                                  {formatAmount(payment.total_amount)} +
                                  Réduction appliquée:{" "}
                                  {formatAmount(payment.reduction_amount)} =
                                  Valeur totale:{" "}
                                  {formatAmount(
                                    payment.total_amount +
                                      payment.reduction_amount
                                  )}
                                </small>
                              </div>
                            )}
                          {(payment.has_scholarship ||
                            payment.has_reduction) && (
                            <span
                              className={`badge ms-2 ${
                                payment.has_scholarship
                                  ? "bg-success"
                                  : "bg-info"
                              }`}
                            >
                              {payment.has_scholarship && payment.has_reduction
                                ? "Bourse + Réduction"
                                : payment.has_scholarship
                                ? "Avec Bourse"
                                : "Avec Réduction"}
                            </span>
                          )}
                          <br />
                          <div className="text-muted d-flex align-items-center gap-3">
                            <small className="text-muted d-flex align-items-center mt-2">
                              <Calendar size={14} className="me-1" />
                              {formatDate(payment.payment_date)}
                            </small>
                            <br />
                            <small className="text-muted d-flex align-items-center">
                              <CreditCard size={14} className="me-1" />
                              {getPaymentMethodLabel(
                                payment.payment_method,
                                payment.is_rame_physical
                              )}
                            </small>
                          </div>

                          {/* Affichage des réductions appliquées */}
                          {(payment.has_scholarship ||
                            payment.has_reduction) && (
                            <div className="mt-2">
                              {payment.has_scholarship && (
                                <div className="badge bg-success me-1 mb-1">
                                  Bourse:{" "}
                                  {formatAmount(payment.scholarship_amount)}
                                </div>
                              )}
                              {payment.has_reduction &&
                                payment.reduction_amount > 0 && (
                                  <div className="badge bg-info me-1 mb-1">
                                    Réduction:{" "}
                                    {formatAmount(payment.reduction_amount)}
                                  </div>
                                )}
                              {payment.discount_reason && (
                                <small className="text-success d-block">
                                  <em>{payment.discount_reason}</em>
                                </small>
                              )}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() =>
                            handlePrintReceiptFromHistory(payment.id)
                          }
                        >
                          <Receipt size={14} />
                        </Button>
                      </div>
                      {payment.notes && (
                        <small className="text-muted d-block mt-1">
                          Note: {payment.notes}
                        </small>
                      )}
                    </div>
                  ))}
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
                  <Form.Label>
                    Montant du versement ({schoolSettings.currency || "FCFA"}) *
                  </Form.Label>
                  <Form.Control
                    type="number"
                    min="1"
                    max={totals.remaining}
                    step="1"
                    value={paymentForm.amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    placeholder="Ex: 25000"
                    required
                  />
                  <Form.Text className="text-muted">
                    Reste à payer: {formatAmount(totals.remaining)}
                    <br />
                    {paymentForm.payment_method === "rame_physical" ? (
                      <small className="text-info">
                        ℹ️ Paiement par rame physique - Montant équivalent de la
                        tranche RAME
                      </small>
                    ) : (
                      <small className="text-warning">
                        ⚠️ Le montant ne peut pas dépasser le solde restant
                      </small>
                    )}
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Mode de paiement *</Form.Label>
                  <Form.Select
                    value={paymentForm.payment_method}
                    onChange={(e) => {
                      const newMethod = e.target.value;
                      setPaymentForm({
                        ...paymentForm,
                        payment_method: newMethod,
                        is_rame_physical: false, // Reset RAME choice when method changes
                      });
                    }}
                    required
                  >
                    <option value="cash">Banque</option>
                    <option value="card">Carte bancaire</option>
                    <option value="transfer">Virement</option>
                    <option value="check">Chèque</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            {/* Anciennes sections de réduction supprimées - maintenant intégrées dans la logique de date */}

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Date de versement *</Form.Label>
                  <Form.Control
                    type="date"
                    value={paymentForm.versement_date}
                    onChange={(e) => {
                      setPaymentForm({
                        ...paymentForm,
                        versement_date: e.target.value,
                      });
                      // Vérifier l'éligibilité aux réductions quand la date change
                      checkDiscountEligibilityInModal(e.target.value);
                    }}
                    required
                  />
                  <Form.Text className="text-muted">
                    Date effective du versement de l'étudiant
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    Date de validation{" "}
                    <small className="text-muted">(automatique)</small>
                  </Form.Label>
                  <Form.Control
                    type="date"
                    value={paymentForm.payment_date}
                    onChange={(e) =>
                      setPaymentForm({
                        ...paymentForm,
                        payment_date: e.target.value,
                      })
                    }
                  />
                  <Form.Text className="text-muted">
                    Date officielle d'enregistrement du paiement dans le
                    système.
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>

            {/* Section de réduction dynamique basée sur la date de versement */}
            {isCheckingDiscount && (
              <Row className="mb-3">
                <Col>
                  <div className="text-center">
                    <Spinner animation="border" size="sm" className="me-2" />
                    <small className="text-muted">
                      Vérification des réductions disponibles...
                    </small>
                  </div>
                </Col>
              </Row>
            )}

            {modalDiscountInfo &&
              !modalDiscountInfo.not_eligible &&
              !modalDiscountInfo.is_date_expired && (
                <Row className="mb-3">
                  <Col>
                    <Card className="bg-success bg-opacity-10 border-success">
                      <Card.Body className="py-3">
                        <div className="d-flex align-items-center justify-content-between">
                          <div>
                            <h6 className="text-success mb-1">
                              🎉 Réduction de{" "}
                              {modalDiscountInfo.discount_percentage}%
                              disponible !
                            </h6>
                            <small className="text-muted">
                              Économisez{" "}
                              {formatAmount(
                                modalDiscountInfo.normal_totals.total_discount
                              )}
                              en payant{" "}
                              {formatAmount(
                                modalDiscountInfo.normal_totals
                                  .total_with_discount
                              )}
                              au lieu de{" "}
                              {formatAmount(
                                modalDiscountInfo.normal_totals.total_required
                              )}
                            </small>
                          </div>
                          <Form.Check
                            type="checkbox"
                            label="Appliquer la réduction"
                            checked={paymentForm.apply_discount}
                            onChange={(e) =>
                              handleDiscountToggle(e.target.checked)
                            }
                            className="text-success"
                          />
                        </div>
                        {paymentForm.apply_discount && (
                          <div className="mt-2 p-2 bg-success bg-opacity-25 rounded">
                            <small className="text-success">
                              ✅ <strong>Réduction activée :</strong> Le montant
                              sera automatiquement réparti sur toutes les
                              tranches avec les montants réduits.
                            </small>
                          </div>
                        )}
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              )}

            {modalDiscountInfo && modalDiscountInfo.is_date_expired && (
              <Row className="mb-3">
                <Col>
                  <Card className="bg-warning bg-opacity-10 border-warning">
                    <Card.Body className="py-3">
                      <h6 className="text-warning mb-1">
                        ⏰ {modalDiscountInfo.deadline_message}
                      </h6>
                      <small className="text-muted">
                        La réduction de {modalDiscountInfo.discount_percentage}%
                        n'est plus disponible pour cette date de versement.
                      </small>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            )}

            {modalDiscountInfo && modalDiscountInfo.not_eligible && (
              <Row className="mb-3">
                <Col>
                  <Card className="bg-secondary bg-opacity-10 border-secondary">
                    <Card.Body className="py-3">
                      <h6 className="text-muted mb-1">
                        ℹ️ Réduction non disponible
                      </h6>
                      <small className="text-muted">
                        {modalDiscountInfo.message}
                      </small>
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
                    onChange={(e) =>
                      setPaymentForm({
                        ...paymentForm,
                        reference_number: e.target.value,
                      })
                    }
                    placeholder="Numéro chèque, virement..."
                  />
                </Form.Group>
              </Col>
              <Col md={6}>{/* Empty column for spacing */}</Col>
            </Row>

            <Row>
              <Col>
                <Form.Group className="mb-3">
                  <Form.Label>Notes</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={paymentForm.notes}
                    onChange={(e) =>
                      setPaymentForm({ ...paymentForm, notes: e.target.value })
                    }
                    placeholder="Notes additionnelles..."
                  />
                </Form.Group>
              </Col>
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
      <Modal
        show={showReceiptModal}
        onHide={() => setShowReceiptModal(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Reçu de Paiement</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div dangerouslySetInnerHTML={{ __html: receiptHtml }} />
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowReceiptModal(false)}
          >
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
