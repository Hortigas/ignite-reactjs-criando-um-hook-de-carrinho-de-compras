import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
    children: ReactNode;
}

interface UpdateProductAmount {
    productId: number;
    amount: number;
}

interface CartContextData {
    cart: Product[];
    addProduct: (productId: number) => Promise<void>;
    removeProduct: (productId: number) => void;
    updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
    const [cart, setCart] = useState<Product[]>(() => {
        const storagedCart = localStorage.getItem('@RocketShoes:cart');
        if (storagedCart) {
            return JSON.parse(storagedCart);
        }
        return [];
    });

    const addProduct = async (productId: number) => {
        try {
            const newCart = [...cart];

            const amountInStock = await api.get(`stock/${productId}`).then((response) => response.data.amount);
            if (0 === amountInStock) {
                toast.error('Quantidade solicitada fora de estoque');
                return;
            }

            let foundIndex = newCart.findIndex((v) => v.id === productId);
            if (foundIndex === -1) {
                const product = Object.assign(await api.get(`products/${productId}`).then((response) => response.data), { amount: 1 });
                newCart.push(product as Product);
            } else if (amountInStock > newCart[foundIndex].amount) {
                newCart[foundIndex].amount++;
            } else {
                toast.error('Quantidade solicitada fora de estoque');
                return;
            }

            localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
            setCart(newCart);
        } catch {
            toast.error('Erro na adição do produto');
        }
    };

    const removeProduct = (productId: number) => {
        try {
            const newCart = [...cart];
            let foundIndex = newCart.findIndex((v) => v.id === productId);
            if (foundIndex === -1) throw Error();

            newCart.splice(foundIndex, 1);

            localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
            setCart(newCart);
        } catch {
            toast.error('Erro na remoção do produto');
        }
    };

    const updateProductAmount = async ({ productId, amount }: UpdateProductAmount) => {
        try {
            if (amount <= 0) return;

            const amountInStock = await api.get(`stock/${productId}`).then((response) => response.data.amount);

            if (amountInStock < amount) {
                toast.error('Quantidade solicitada fora de estoque');
                return;
            }

            const newCart = [...cart];
            let foundIndex = newCart.findIndex((v) => v.id === productId);

            if (foundIndex === -1) throw Error();
            newCart[foundIndex].amount = amount;
            localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
            setCart(newCart);
        } catch {
            toast.error('Erro na alteração de quantidade do produto');
        }
    };

    return <CartContext.Provider value={{ cart, addProduct, removeProduct, updateProductAmount }}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextData {
    const context = useContext(CartContext);

    return context;
}
