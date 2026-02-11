import { type DerivedState } from "../api/common-types";
import { useCallback, useEffect, useState } from "react";
import { type ContractControllerInterface } from "../api/contractController";
import { type Observable } from "rxjs";
import { useWallet } from "../../wallet-widget/hooks/useWallet";
import { type ContractDeployment, type ContractFollow } from "../contexts";
import { useDeployedContracts } from "./use-deployment";
import { useProviders } from "./use-providers";

export const useContractSubscription = () => {
  const { status } = useWallet();
  const providers = useProviders();
  const deploy = useDeployedContracts();

  const [counterDeploymentObservable, setCounterDeploymentObservable] =
    useState<Observable<ContractDeployment> | undefined>(undefined);

  const [contractDeployment, setContractDeployment] =
    useState<ContractDeployment>();
  const [deployedContractAPI, setDeployedContractAPI] =
    useState<ContractControllerInterface>();
  const [derivedState, setDerivedState] = useState<DerivedState>();

  const onDeploy = async (): Promise<ContractFollow | null> => {
    if (!deploy) return null;
    const contractFollow = await deploy.deployContract();
    return contractFollow;
  };

  const onJoin = useCallback(async (): Promise<void> => {
    if (!deploy) return;
    setCounterDeploymentObservable(deploy.joinContract().observable);
  }, [deploy, setCounterDeploymentObservable]);

  useEffect(() => {
    if (status?.status === "connected" && providers) {
      void onJoin();
    }
  }, [onJoin, status?.status, providers]);

  useEffect(() => {
    if (!counterDeploymentObservable) {
      return;
    }
    const subscription = counterDeploymentObservable.subscribe(
      setContractDeployment
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [counterDeploymentObservable]);

  useEffect(() => {
    if (!contractDeployment) {
      return;
    }

    if (
      contractDeployment.status === "in-progress" ||
      contractDeployment.status === "failed"
    ) {
      return;
    }
    setDeployedContractAPI((prev) => prev || contractDeployment.api);
  }, [contractDeployment, setDeployedContractAPI]);

  useEffect(() => {
    if (deployedContractAPI) {
      const subscriptionDerivedState =
        deployedContractAPI.state$.subscribe(setDerivedState);
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
