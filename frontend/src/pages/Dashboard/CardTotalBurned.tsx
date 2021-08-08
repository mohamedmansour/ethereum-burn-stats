import { FaBurn } from 'react-icons/fa';
import { Card } from "../../atoms/Card";
import { BigNumberText } from "../../organisms/BigNumberText";
import { BigNumber } from "ethers";

export function CardTotalBurned({ totalBurned, amount }: { totalBurned: BigNumber; amount: number; }) {
  return (
    <Card 
        title="Total Burned"
        icon={FaBurn}
        w={["100%", "100%", 300]}>
      <BigNumberText number={totalBurned} usdConversion={amount} fontSize={24} justifyContent="flex-end" forced="ether" />
    </Card>
  );
}
