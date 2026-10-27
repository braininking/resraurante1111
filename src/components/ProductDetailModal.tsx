import React, { useState } from 'react';
import { Product, OrderItemOption } from '../types';
import { formatCurrency } from '../utils/formatters';
import { X, Plus, Minus, ShoppingBag, Check } from 'lucide-react';

interface Props {
  product: Product;
  onClose: () => void;
  onAddToCart: (item: {
    product: Product;
    quantity: number;
    unitPrice: number;
    selectedOptions: OrderItemOption[];
    removedIngredients: string[];
    observation: string;
    subtotal: number;
    pizzaDetails?: {
      size: string;
      flavors: string[];
      crust?: string;
    };
  }) => void;
}

export const ProductDetailModal: React.FC<Props> = ({ product, onClose, onAddToCart }) => {
  const [quantity, setQuantity] = useState(1);
  const [observation, setObservation] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<Record<string, Record<string, number>>>({});
  const [removedIngredients, setRemovedIngredients] = useState<string[]>([]);

  // Base price calculation
  const basePrice = product.promotionalPrice && product.promotionalPrice > 0
    ? product.promotionalPrice
    : product.price;

  // Toggle single or multi option
  const handleOptionChange = (group: any, item: any, isSingleChoice: boolean) => {
    setSelectedOptions((prev) => {
      const currentGroup = prev[group.id] || {};

      if (isSingleChoice) {
        return {
          ...prev,
          [group.id]: { [item.id]: 1 },
        };
      }

      const currentQty = currentGroup[item.id] || 0;
      const totalInGroup = Object.values(currentGroup).reduce((sum, q) => sum + q, 0);

      if (currentQty > 0) {
        // remove
        const updated = { ...currentGroup };
        delete updated[item.id];
        return { ...prev, [group.id]: updated };
      } else {
        // add if below max
        if (totalInGroup < group.max) {
          return {
            ...prev,
            [group.id]: { ...currentGroup, [item.id]: 1 },
          };
        }
        return prev;
      }
    });
  };

  // Toggle ingredient removal
  const toggleRemovedIngredient = (ing: string) => {
    setRemovedIngredients((prev) =>
      prev.includes(ing) ? prev.filter((i) => i !== ing) : [...prev, ing]
    );
  };

  // Calculate options extra price
  let optionsExtra = 0;
  const flatSelectedOptions: OrderItemOption[] = [];

  product.optionGroups?.forEach((group) => {
    const groupSelections = selectedOptions[group.id] || {};
    group.items.forEach((item) => {
      const qty = groupSelections[item.id] || 0;
      if (qty > 0) {
        optionsExtra += (item.price || 0) * qty;
        flatSelectedOptions.push({
          groupId: group.id,
          groupName: group.name,
          itemId: item.id,
          itemName: item.name,
          price: item.price || 0,
          quantity: qty,
        });
      }
    });
  });

  const unitTotal = basePrice + optionsExtra;
  const currentSubtotal = parseFloat((unitTotal * quantity).toFixed(2));

  // Validation: are all required groups satisfied?
  const missingRequiredGroups = (product.optionGroups || []).filter((g) => {
    if (!g.required) return false;
    const groupSelections = selectedOptions[g.id] || {};
    const totalCount = Object.values(groupSelections).reduce((sum, q) => sum + q, 0);
    return totalCount < g.min;
  });

  const isValid = missingRequiredGroups.length === 0;

  const handleAdd = () => {
    if (!isValid) return;

    onAddToCart({
      product,
      quantity,
      unitPrice: basePrice,
      selectedOptions: flatSelectedOptions,
      removedIngredients,
      observation,
      subtotal: currentSubtotal,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in slide-in-from-bottom duration-200">
        {/* Header with image */}
        <div className="relative h-48 sm:h-56 w-full bg-slate-900 shrink-0">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover opacity-90"
          />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors backdrop-blur-xs"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable details */}
        <div className="p-5 overflow-y-auto space-y-5 divide-y divide-slate-100">
          <div>
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-bold text-slate-900 leading-snug">{product.name}</h2>
              <div className="text-right shrink-0">
                <span className="text-lg font-black text-orange-600">
                  {formatCurrency(basePrice)}
                </span>
                {product.promotionalPrice && (
                  <span className="block text-xs line-through text-slate-400">
                    {formatCurrency(product.price)}
                  </span>
                )}
              </div>
            </div>
            {product.description && (
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">{product.description}</p>
            )}
          </div>

          {/* Option Groups */}
          {product.optionGroups?.map((group) => {
            const isSingle = group.max === 1;
            const groupSelections = selectedOptions[group.id] || {};
            const totalCount = Object.values(groupSelections).reduce((sum, q) => sum + q, 0);
            const isMissing = group.required && totalCount < group.min;

            return (
              <div key={group.id} className="pt-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-sm text-slate-900 flex items-center gap-1.5">
                      {group.name}
                      {group.required && (
                        <span className="text-[10px] uppercase font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                          Obrigatório
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-slate-500">
                      {group.description || (isSingle ? 'Escolha 1 opção' : `Escolha até ${group.max} opções`)}
                    </p>
                  </div>
                  {isMissing && (
                    <span className="text-[11px] font-medium text-red-500">
                      Selecione {group.min}
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  {group.items.map((item) => {
                    const isChecked = (groupSelections[item.id] || 0) > 0;
                    return (
                      <label
                        key={item.id}
                        onClick={() => handleOptionChange(group, item, isSingle)}
                        className={`flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                          isChecked
                            ? 'border-orange-500 bg-orange-50/50 text-slate-900 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-4 h-4 rounded-${isSingle ? 'full' : 'md'} border flex items-center justify-center transition-colors ${
                              isChecked
                                ? 'bg-orange-600 border-orange-600 text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span className="font-medium">{item.name}</span>
                        </div>
                        {item.price > 0 && (
                          <span className="font-semibold text-slate-700">
                            +{formatCurrency(item.price)}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Removable Ingredients */}
          {product.removableIngredients && product.removableIngredients.length > 0 && (
            <div className="pt-4 space-y-2">
              <h4 className="font-semibold text-sm text-slate-900">Remover Ingredientes</h4>
              <p className="text-xs text-slate-500">Marque o que você NÃO deseja no seu item:</p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                {product.removableIngredients.map((ing) => {
                  const isRemoved = removedIngredients.includes(ing);
                  return (
                    <button
                      key={ing}
                      type="button"
                      onClick={() => toggleRemovedIngredient(ing)}
                      className={`text-left px-3 py-2 rounded-lg border text-xs font-medium transition-colors flex items-center justify-between ${
                        isRemoved
                          ? 'bg-red-50 border-red-300 text-red-700 font-semibold'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span>{ing}</span>
                      {isRemoved && <span className="text-[10px] text-red-600 uppercase">Retirar</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Observations */}
          <div className="pt-4 space-y-2">
            <h4 className="font-semibold text-sm text-slate-900">Observações adicionais</h4>
            <textarea
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder="Ex: Caprichar no molho, carne bem passada, enviar talheres descartáveis..."
              rows={2}
              maxLength={150}
              className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-800 placeholder-slate-400"
            />
          </div>
        </div>

        {/* Footer sticky bar */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center border border-slate-300 rounded-xl bg-white shadow-xs">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              className="p-2.5 text-slate-600 hover:text-slate-900 disabled:opacity-30 transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-8 text-center text-sm font-bold text-slate-900">{quantity}</span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="p-2.5 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleAdd}
            disabled={!isValid}
            className={`flex-1 flex items-center justify-between px-5 py-3 rounded-xl font-bold text-sm text-white shadow-sm transition-all ${
              isValid
                ? 'bg-orange-600 hover:bg-orange-500 active:scale-[0.98]'
                : 'bg-slate-300 cursor-not-allowed opacity-75'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4" />
              {isValid ? 'Adicionar ao Carrinho' : 'Selecione as opções'}
            </span>
            <span>{formatCurrency(currentSubtotal)}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
