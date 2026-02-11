import { type DerivedState } from "../api/common-types";
import { useCallback, useEffect, useState } from "react";
import { type ContractControllerInterface } from "../api/contractController";
import { type Observable } from "rxjs";
import { useWallet } from "../../wallet-widget/hooks/useWallet";
import { type NftContractDeployment, type NftContractFollow } from "../contexts";
import { useNftDeployedContracts } from "./use-deployment";
import { useNftProviders } from "./use-providers";

export const useNftContractSubscription = () => {
  const { status } = useWallet();
  const providers = useNftProviders();
  const deploy = useNftDeployedContracts();

  const [nftDeploymentObservable, setNftDeploymentObservable] =
    useState<Observable<NftContractDeployment> | undefined>(undefined);

  const [contractDeployment, setContractDeployment] =
    useState<NftContractDeployment>();
  const [deployedContractAPI, setDeployedContractAPI] =
    useState<ContractControllerInterface>();
  const [derivedState, setDerivedState] = useState<DerivedState>();

  const onDeploy = async (): Promise<NftContractFollow | null> => {
    if (!deploy) return null;
    const contractFollow = await deploy.deployContract();
    return contractFollow;
  };

  const onJoin = useCallback(async (): Promise<void> => {
    if (!deploy) return;
    setNftDeploymentObservable(deploy.joinContract().observable);
  }, [deploy, setNftDeploymentObservable]);

  useEffect(() => {
    if (status?.status === "connected" && providers) {
      void onJoin();
    }
  }, [onJoin, status?.status, providers]);

  useEffect(() => {
    if (!nftDeploymentObservable) return;
    const subscription = nftDeploymentObservable.subscribe(setContractDeployment);
    return () => {
      subscription.unsubscribe();
    };
  }, [nftDeploymentObservable]);

  useEffect(() => {
    if (!contractDeployment) return;
    if (contractDeployment.status === "in-progress" || contractDeployment.status === "failed") return;
    setDeployedContractAPI((prev) => prev || contractDeployment.api);
  }, [contractDeployment, setDeployedContractAPI]);

  useEffect(() => {
    if (deployedContractAPI) {
      const subscriptionDerivedState = deployedContractAPI.state$.subscribe(setDerivedState);
      return () => {
        subscriptionDerivedState.unsubscribe();
      };
    }
  }, [deployedContractAPI]);

  return {
    deployedContractAPI,
    derivedState,
    contractDeployment,
    onDeploy,
    providers,
  };
};
