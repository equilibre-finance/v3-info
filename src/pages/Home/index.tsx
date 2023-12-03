import React, { useState, useEffect, useMemo } from 'react'
import styled from 'styled-components'
import { AutoColumn } from 'components/Column'
import { TYPE } from 'theme'
import { ResponsiveRow, RowBetween, RowFixed } from 'components/Row'
import LineChart from 'components/LineChart/alt'
import useTheme from 'hooks/useTheme'
import { useProtocolChartData, useProtocolData, useProtocolTransactions } from 'state/protocol/hooks'
import { DarkGreyCard } from 'components/Card'
import { formatDollarAmount } from 'utils/numbers'
import Percent from 'components/Percent'
import { HideMedium, HideSmall, StyledInternalLink } from '../../theme/components'
import TokenTable from 'components/tokens/TokenTable'
import PoolTable from 'components/pools/PoolTable'
import { PageWrapper, ThemedBackgroundGlobal } from 'pages/styled'
import { unixToDate } from 'utils/date'
import BarChart from 'components/BarChart/alt'
import { useAllPoolData } from 'state/pools/hooks'
import { notEmpty } from 'utils'
import TransactionsTable from '../../components/TransactionsTable'
import { useAllTokenData } from 'state/tokens/hooks'
import { MonoSpace } from 'components/shared'
import { useActiveNetworkVersion } from 'state/application/hooks'
import { useTransformedVolumeData } from 'hooks/chart'
import { SmallOptionButton } from 'components/Button'
import { VolumeWindow } from 'types'
import { Trace } from '@uniswap/analytics'

import axios from 'axios';

const ChartWrapper = styled.div`
  width: 49%;

  ${({ theme }) => theme.mediaWidth.upToSmall`
    width: 100%;
  `};
`

export default function Home() {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const theme = useTheme()

  const [activeNetwork] = useActiveNetworkVersion()

  const [protocolData] = useProtocolData()
  const [transactions] = useProtocolTransactions()
  
  const [liquidityHover, setLiquidityHover] = useState<number | undefined>()
  const [leftLabel, setLeftLabel] = useState<string | undefined>()
  const [rightLabel, setRightLabel] = useState<string | undefined>()

  const [chartData] = useProtocolChartData()  
  const allPoolData = useAllPoolData()

  const [volumeWindow, setVolumeWindow] = useState(VolumeWindow.weekly) 
  const [totalTVL, setTotalTVL] = useState(0);
  const [volume24, setVolume24] = useState(0);
  
  const poolDatas = useMemo(() => {
    return Object.values(allPoolData)
      .map((p) => p.data)
      .filter(notEmpty)
  }, [allPoolData])

  
  useEffect(() => {
    if (liquidityHover === undefined && protocolData) {
      setLiquidityHover(protocolData.tvlUSD)
    }
  }, [liquidityHover, protocolData])
  
  const formattedTvlData = useMemo(() => {
    if (chartData) {
      return chartData.map((day) => {
        return {
          time: unixToDate(day.date),
          value: day.tvlUSD,
        }
      })
    } else {
      return []
    }
  }, [chartData])

  const formattedVolumeData = useMemo(() => {
    if (chartData) {
      return chartData.map((day) => {
        return {
          time: unixToDate(day.date),
          value: day.volumeUSD,
        }
      })
    } else {
      return []
    }
  }, [chartData])

  const weeklyVolumeData = useTransformedVolumeData(chartData, 'week')
  const monthlyVolumeData = useTransformedVolumeData(chartData, 'month')

  const allTokens = useAllTokenData()

  const formattedTokens = useMemo(() => {
    return Object.values(allTokens)
      .map((t) => t.data)
      .filter(notEmpty)
  }, [allTokens])

  

  // Fetch TVL data from the API
  useEffect(() => {    
    const getContractDataTVL = async () => {
      try {
        const response = await axios.get(`https://apitest.equilibrefinance.com/api/v1/pairs`);
        const items = response.data.data;
        const tvl = items.reduce((acc: number, item: any) => acc + item.tvl, 0);
        setTotalTVL(tvl);
      } catch (error) {
        console.error("Failed to fetch TVL:", error);
      }
    };

    getContractDataTVL();
  }, []); 

  useEffect(() => {  
    const getVolumeData = async () => {
      try {
        const response = await axios.get(`https://api.old.equilibrefinance.com/api/v1/configuration`);
        const data = response.data.meta;
        const volume = data.volume.volume_h24;
        setVolume24(volume);
      } catch (error) {
        console.error("Failed to fetch volume:", error);
      }
    };

    getVolumeData();
  }, []); 

  
  return (
    <Trace page={'home-page'} shouldLogImpression>
      <PageWrapper>
        <ThemedBackgroundGlobal $backgroundColor={activeNetwork.bgColor} />
        <AutoColumn $gap="16px">
          <TYPE.main>Equilibre Overview</TYPE.main>
          <ResponsiveRow>
            <ChartWrapper>
              <LineChart
                data={formattedTvlData}
                height={220}
                minHeight={332}
                color={activeNetwork.primaryColor}
                value={liquidityHover}
                label={leftLabel}
                setValue={setLiquidityHover}
                setLabel={setLeftLabel}
                topLeft={
                  <AutoColumn $gap="4px">
                    <TYPE.mediumHeader fontSize="16px">TVL</TYPE.mediumHeader>
                    <TYPE.largeHeader fontSize="32px">
                      <MonoSpace>{formatDollarAmount(totalTVL, 2, true)} </MonoSpace>
                    </TYPE.largeHeader>
                    <TYPE.main fontSize="12px" height="14px">
                      {leftLabel ? <MonoSpace>{leftLabel} (UTC)</MonoSpace> : null}
                    </TYPE.main>
                  </AutoColumn>
                }
              />
            </ChartWrapper>
            <ChartWrapper>
              <BarChart
                height={220}
                minHeight={332}
                data={
                  volumeWindow === VolumeWindow.monthly
                    ? monthlyVolumeData
                    : volumeWindow === VolumeWindow.weekly
                    ? weeklyVolumeData
                    : formattedVolumeData
                }
                color={theme?.blue1}
                setLabel={setRightLabel}
                value={volume24}
                label={rightLabel}
                activeWindow={volumeWindow}
                topRight={
                  <RowFixed style={{ marginLeft: '-40px', marginTop: '8px' }}>
                    <SmallOptionButton
                      $active={volumeWindow === VolumeWindow.daily}
                      onClick={() => setVolumeWindow(VolumeWindow.daily)}
                    >
                      D
                    </SmallOptionButton>
                    <SmallOptionButton
                      $active={volumeWindow === VolumeWindow.weekly}
                      style={{ marginLeft: '8px' }}
                      onClick={() => setVolumeWindow(VolumeWindow.weekly)}
                    >
                      W
                    </SmallOptionButton>
                    <SmallOptionButton
                      $active={volumeWindow === VolumeWindow.monthly}
                      style={{ marginLeft: '8px' }}
                      onClick={() => setVolumeWindow(VolumeWindow.monthly)}
                    >
                      M
                    </SmallOptionButton>
                  </RowFixed>
                }
                topLeft={
                  <AutoColumn $gap="4px">
                    <TYPE.mediumHeader fontSize="16px">Volume 24H</TYPE.mediumHeader>
                    <TYPE.largeHeader fontSize="32px">
                      <MonoSpace> {formatDollarAmount(volume24, 2)}</MonoSpace>
                    </TYPE.largeHeader>
                    <TYPE.main fontSize="12px" height="14px">
                      {rightLabel ? <MonoSpace>{rightLabel} (UTC)</MonoSpace> : null}
                    </TYPE.main>
                  </AutoColumn>
                }
              />
            </ChartWrapper>
          </ResponsiveRow>
          <HideSmall>
            <DarkGreyCard>
              <RowBetween>
                <RowFixed>
                  <RowFixed mr="20px">
                    <TYPE.main mr="4px">Volume 24H: </TYPE.main>
                    <TYPE.label mr="4px">{formatDollarAmount(volume24)}</TYPE.label>                    
                  </RowFixed>
                  <RowFixed mr="20px">
                    <TYPE.main mr="4px">Fees 24H: </TYPE.main>
                    <TYPE.label mr="4px">{formatDollarAmount(protocolData?.feesUSD)}</TYPE.label>
                    <Percent value={protocolData?.feeChange} wrap={true} />
                  </RowFixed>
                  <HideMedium>
                    <RowFixed mr="20px">
                      <TYPE.main mr="4px">TVL: </TYPE.main>
                      <TYPE.label mr="4px">{formatDollarAmount(totalTVL)}</TYPE.label>
                      <TYPE.main></TYPE.main>                      
                    </RowFixed>
                  </HideMedium>
                </RowFixed>
              </RowBetween>
            </DarkGreyCard>
          </HideSmall>
          <RowBetween>
            <TYPE.main>Top Tokens</TYPE.main>
            <StyledInternalLink to="tokens">Explore</StyledInternalLink>
          </RowBetween>
          <TokenTable tokenDatas={formattedTokens} />
          <RowBetween>
            <TYPE.main>Top Pools</TYPE.main>
            <StyledInternalLink to="pools">Explore</StyledInternalLink>
          </RowBetween>
          <PoolTable poolDatas={poolDatas} />
          <RowBetween>
            <TYPE.main>Transactions</TYPE.main>
          </RowBetween>
          {transactions ? <TransactionsTable transactions={transactions} color={activeNetwork.primaryColor} /> : null}
        </AutoColumn>
      </PageWrapper>
    </Trace>
  )
}
