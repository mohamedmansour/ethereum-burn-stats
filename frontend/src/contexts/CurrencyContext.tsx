import { createContext } from "react"
import { useReducer } from "react"
import { useEffect } from "react"
import { useContext } from "react"
import { Loader } from "../components/Loader"

const REFRESH_TIME = 300000 // 5min

interface Price {
  data: {
    base: 'ETH',
    currency: 'USD',
    amount: string
  }
}

export type Currency = 'ETH' | 'USD'

interface CurrencyState {
  ethConversion?: number
  currency?: Currency
  amount?: number
}

interface CurrencyContextType  extends CurrencyState {
  setCurrency(currency: Currency): void
}

interface UpdateEthPriceAction {
  type: 'UPDATE_ETH_CONVERSION',
  value: number
}

interface ChangeCurrencyAction {
  type: 'CHANGE_CURRENCY',
  value: Currency
}

type CurrencyAction = UpdateEthPriceAction | ChangeCurrencyAction

const currencyReducer = (
  state: CurrencyState,
  action: CurrencyAction
): CurrencyState => {
  switch (action.type) {
    case 'CHANGE_CURRENCY': {
      return {...state, currency: action.value, amount: action.value === 'USD' ? state.ethConversion : 1}
    }
    case 'UPDATE_ETH_CONVERSION': {
      return {...state, ethConversion: action.value, amount: state.currency === 'USD' ? action.value : 1}
    }
  }
}

const CurrencyContext = createContext<CurrencyContextType>({
  ethConversion: undefined,
  currency: undefined,
  amount: undefined,
  setCurrency: () => {},
})

const useCurrency = () => useContext(CurrencyContext)

const CurrencyProvider = ({
  children
}: {
  children: React.ReactNode
}) => {
  const [state, dispatch] = useReducer(currencyReducer, {
    ethConversion: 1,
    currency: 'ETH',
    amount: 1
  })

  useEffect(() => {
    const refreshConversion = async () => {
      const resp = await fetch('/price.json')
      const results: Price = await resp.json()
      dispatch({ type: 'UPDATE_ETH_CONVERSION', value: parseInt(results.data.amount) })
    }

    const interval = setInterval(refreshConversion, REFRESH_TIME)
    refreshConversion()

    return () => clearInterval(interval)
  }, [])

  const setCurrency = (value: Currency) => {
    dispatch({ type: 'CHANGE_CURRENCY', value })
  }

  return (
    <CurrencyContext.Provider value={{
      ...state,
      setCurrency
    }}>
      {state.ethConversion ? children : <Loader>fetching currency</Loader>}
    </CurrencyContext.Provider>
  )
}

export { useCurrency, CurrencyProvider }